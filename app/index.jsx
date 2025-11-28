import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, ScrollView, Text, View } from "react-native";

const TOTAL_ROWS = 10000;
const TOTAL_COLS = 100;
const ROW_HEIGHT = 40;
const COL_WIDTH = 120;
const PAGE_SIZE = 200;
const TABLE_WIDTH = TOTAL_COLS * COL_WIDTH;

const SKELETON_EXTRA_ROWS = 8;
const INITIAL_SKELETON_ROWS = 20;

function SkeletonCell({ dark = false }) {
  return (
    <View
      style={{
        width: COL_WIDTH,
        height: ROW_HEIGHT,
        borderRadius: 4,
        marginRight: 1,
        // static colors, no animation
        backgroundColor: dark ? "#cbd5e1" : "#e5e7eb",
      }}
    />
  );
}

function SkeletonRow({ dark = false }) {
  return (
    <View
      style={{
        flexDirection: "row",
        width: TABLE_WIDTH,
        height: ROW_HEIGHT,
      }}
    >
      {Array.from({ length: TOTAL_COLS }).map((_, col) => (
        <SkeletonCell key={`sk-${col}`} dark={dark} />
      ))}
    </View>
  );
}


function Index() {
  const [baseItems, setBaseItems] = useState([]);
  const [rowsCount, setRowsCount] = useState(PAGE_SIZE);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // track scroll state
  const [isScrolling, setIsScrolling] = useState(false);

  // Fetch base data for cell labels
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("https://dummyjson.com/products?limit=200");
          const json = await res.json();
          setBaseItems(json.products || []);
      } catch (e) {
        console.error("Error fetching data", e);
      } finally {
        setTimeout(() => {
          setLoadingInitial(false);
        }, 600);
      }
    };
    load();
  }, []);

  const getCellLabel = (row, col) => {
    if (!baseItems || baseItems.length === 0) {
      return `R${row} C${col}`;
    }
    const base = baseItems[(row + col) % baseItems.length];
    const baseTitle = base?.title || base?.name || "Item";
    return `${baseTitle} (${row},${col})`;
  };

  const rows = useMemo(
    () => Array.from({ length: rowsCount }, (_, i) => i),
    [rowsCount]
  );

  const data = useMemo(() => {
    const realRows = rows.map((index) => ({
      type: "row",
      index,
    }));

    if (!loadingMore) return realRows;

    const skeletonRows = Array.from(
      { length: SKELETON_EXTRA_ROWS },
      (_, i) => ({
        type: "skeleton",
        id: `skeleton-${i}`,
      })
    );

    return [...realRows, ...skeletonRows];
  }, [rows, loadingMore]);

  const renderRow = ({ item }) => {
    // Skeleton row at bottom while loading more (light)
    if (item.type === "skeleton") {
      return <SkeletonRow />;
    }

    // 👉 WHILE SCROLLING: darker skeleton instead of real data
    if (isScrolling) {
      return <SkeletonRow dark />;
    }

    // Normal data row (when NOT scrolling)
    const rowIndex = item.index;

    return (
      <View
        style={{
          flexDirection: "row",
          width: TABLE_WIDTH,
          height: ROW_HEIGHT,
        }}
      >
        {Array.from({ length: TOTAL_COLS }).map((_, col) => (
          <View
            key={`${rowIndex}-${col}`}
            className="border border-gray-200 items-center justify-center bg-white"
            style={{
              width: COL_WIDTH,
              height: ROW_HEIGHT,
            }}
          >
            <Text className="text-[10px]" numberOfLines={1}>
              {getCellLabel(rowIndex, col)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const handleLoadMore = () => {
    if (loadingMore) return;
    if (rowsCount >= TOTAL_ROWS) return;

    setLoadingMore(true);

    // simulate network delay
    setTimeout(() => {
      setRowsCount((prev) => Math.min(prev + PAGE_SIZE, TOTAL_ROWS));
      setLoadingMore(false);
    }, 600);
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
        <SkeletonRow />
      </View>
    );
  };

  // Full-screen skeleton GRID for initial load (every cell)
  if (loadingInitial) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "white",
          padding: 12, // 👉 outer padding
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{
            paddingVertical: 8, // a bit of inner padding
          }}
        >
          <View style={{ width: TABLE_WIDTH }}>
            {Array.from({ length: INITIAL_SKELETON_ROWS }).map(
              (_, rowIndex) => (
                <SkeletonRow key={`init-sk-${rowIndex}`} />
              )
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 12, // 👉 outer padding for whole grid
      }}
    >
      {/* single horizontal scroll for whole grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces={false}
        contentContainerStyle={{
          paddingVertical: 8, // inner vertical padding
        }}
      >
        <View style={{ width: TABLE_WIDTH }}>
          <FlashList
            data={data}
            keyExtractor={(item) =>
              item.type === "skeleton" ? item.id : `row-${item.index}`
            }
            renderItem={renderRow}
            estimatedItemSize={ROW_HEIGHT}
            showsVerticalScrollIndicator
            onEndReachedThreshold={0.7}
            onEndReached={handleLoadMore}
            ListFooterComponent={renderFooter}
            // scroll handlers to flip isScrolling
            onScrollBeginDrag={() => setIsScrolling(true)}
            onMomentumScrollBegin={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
            onMomentumScrollEnd={() => setIsScrolling(false)}
          />
        </View>
      </ScrollView>
    </View>
  );
}

export default Index;
