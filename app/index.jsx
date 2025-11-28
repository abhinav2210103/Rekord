import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const TOTAL_ROWS = 10000;
const TOTAL_COLS = 100;
const ROW_HEIGHT = 40;
const COL_WIDTH = 120;
const PAGE_SIZE = 200;
const TABLE_WIDTH = TOTAL_COLS * COL_WIDTH;

const SKELETON_EXTRA_ROWS = 8;
const INITIAL_SKELETON_ROWS = 20;
const OVERLAY_SKELETON_ROWS = 25;

function SkeletonCell({ dark = false }) {
  return (
    <View
      style={{
        width: COL_WIDTH,
        height: ROW_HEIGHT,
        padding: 2, 
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 4,
          backgroundColor: dark ? "#cbd5e1" : "#e5e7eb",
        }}
      />
    </View>
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

  // track scroll state (for overlay)
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
    // bottom skeleton rows while loading more
    if (item.type === "skeleton") {
      return <SkeletonRow />;
    }

    // always render real data here now
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
          padding: 12, // outer padding
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
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
    <View className="mt-10"
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 12, 
        position: "relative", 
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces={false}
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
            // scroll handlers to control overlay
            onScrollBeginDrag={() => setIsScrolling(true)}
            onMomentumScrollBegin={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
            onMomentumScrollEnd={() => setIsScrolling(false)}
          />
        </View>
      </ScrollView>

      {/* 🔥 FULL OVERLAY SKELETON WHILE SCROLLING */}
      {isScrolling && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 12,
            bottom: 12,
            left: 12,
            right: 12,
          }}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            bounces={false}
          >
            <View style={{ width: TABLE_WIDTH }}>
              {Array.from({ length: OVERLAY_SKELETON_ROWS }).map(
                (_, rowIndex) => (
                  <SkeletonRow key={`overlay-sk-${rowIndex}`} dark />
                )
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default Index;
