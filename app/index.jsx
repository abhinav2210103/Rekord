import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const TOTAL_ROWS = 10000;
const TOTAL_COLS = 100;
const ROW_HEIGHT = 40;
const COL_WIDTH = 120;
const PAGE_SIZE = 200; // still used if you ever want pagination
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
        padding: 1,
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
  // ⬇️ Start with ALL 10,000 rows logically available
  const [rowsCount, setRowsCount] = useState(TOTAL_ROWS);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // track scroll state (for overlay)
  const [isScrolling, setIsScrolling] = useState(false);

  // 🔍 log which items are visible using FlashList’s viewability API
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10, // consider item "visible" if 10% is on screen
  }).current;

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

  // logical row indices [0..rowsCount-1]
  const rows = useMemo(
    () => Array.from({ length: rowsCount }, (_, i) => i),
    [rowsCount]
  );

  // FlashList data: real rows + optional skeleton rows at bottom
  const data = useMemo(() => {
    const realRows = rows.map((index) => ({
      type: "row",
      index,
    }));

    // since we start with all rows, you can even set loadingMore = false always
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

  // 🔍 LOG DATA STATS (total rows & cells)
  useEffect(() => {
    const realRowsCount = rows.length;
    const totalCells = realRowsCount * TOTAL_COLS;
    const skeletonCount = data.length - realRowsCount;

    console.log("=== DATA STATS ===");
    console.log("MAX rows supported (TOTAL_ROWS):", TOTAL_ROWS);
    console.log("Total logical rows available right now (rowsCount):", realRowsCount);
    console.log("Skeleton items in data:", skeletonCount);
    console.log("Total items passed to FlashList (real + skeleton):", data.length);
    console.log("Columns per row (TOTAL_COLS):", TOTAL_COLS);
    console.log("Total theoretical cells (rows * cols):", totalCells);
  }, [rows, data]);

  const renderRow = ({ item }) => {
    // bottom skeleton rows while loading more
    if (item.type === "skeleton") {
      return <SkeletonRow />;
    }

    // real data row
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

  // This won't really be used now because rowsCount starts at TOTAL_ROWS
  const handleLoadMore = () => {
    if (loadingMore) return;
    if (rowsCount >= TOTAL_ROWS) return; // guard will always hit now

    console.log("=== LOAD MORE TRIGGERED ===");
    console.log("Current rowsCount:", rowsCount);

    setLoadingMore(true);

    setTimeout(() => {
      setRowsCount((prev) => {
        const next = Math.min(prev + PAGE_SIZE, TOTAL_ROWS);
        console.log("New rowsCount after load more:", next);
        return next;
      });
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

  // 📏 SCROLL HANDLER: logs height from top
  const handleScroll = (event) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const visibleHeight = event.nativeEvent.layoutMeasurement.height;
    const contentHeight = event.nativeEvent.contentSize.height;

    console.log("=== SCROLL POSITION ===");
    console.log("Scroll offset Y (px from top):", offsetY);
    console.log("Visible window height:", visibleHeight);
    console.log("Total content height:", contentHeight);
  };

  // 👀 VIEWABILITY HANDLER: logs which rows are actually visible on screen
  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    // only count real data rows, ignore skeleton items
    const visibleRowIndices = viewableItems
      .filter((v) => v.item.type === "row")
      .map((v) => v.item.index)
      .sort((a, b) => a - b);

    if (visibleRowIndices.length === 0) return;

    const firstVisible = visibleRowIndices[0];
    const lastVisible = visibleRowIndices[visibleRowIndices.length - 1];

    console.log("=== VIRTUALIZATION DEBUG ===");
    console.log("Total logical rows (rowsCount):", rowsCount);
    console.log("Visible rows currently on screen:", visibleRowIndices.length);
    console.log("First visible row index:", firstVisible);
    console.log("Last visible row index:", lastVisible);
    console.log("Visible row indices:", visibleRowIndices);
    console.log(
      "NOTE: Only this small set of rows is mounted, not all",
      rowsCount,
      "rows."
    );
  }).current;

  // Full-screen skeleton GRID for initial load (every cell)
  if (loadingInitial) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "white",
          padding: 12,
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
    <View
      className="mt-10"
      style={{
        flex: 1,
        backgroundColor: "white",
        padding: 12,
        position: "relative",
      }}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
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
            onScrollBeginDrag={() => setIsScrolling(true)}
            onMomentumScrollBegin={() => setIsScrolling(true)}
            onScrollEndDrag={() => setIsScrolling(false)}
            onMomentumScrollEnd={() => setIsScrolling(false)}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
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
