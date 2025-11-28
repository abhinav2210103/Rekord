import { FlashList } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";

const TOTAL_ROWS = 10000;
const TOTAL_COLS = 100;
const ROW_HEIGHT = 40;
const COL_WIDTH = 120;
const PAGE_SIZE = 200;
const TABLE_WIDTH = TOTAL_COLS * COL_WIDTH;

const SKELETON_EXTRA_ROWS = 8;
const INITIAL_SKELETON_ROWS = 20;
const OVERLAY_SKELETON_ROWS = 25;

// how many extra columns to render on each side for horizontal buffer
const H_BUFFER_COLS = 2;

function getVisibleCols(horizontalOffset, viewportWidth) {
  if (viewportWidth <= 0) {
    // fallback: if we don't know viewport width yet, show all columns
    return { start: 0, end: TOTAL_COLS - 1 };
  }

  const firstVisibleIndex = Math.floor(horizontalOffset / COL_WIDTH);
  const visibleCount = Math.ceil(viewportWidth / COL_WIDTH);

  const start = Math.max(0, firstVisibleIndex - H_BUFFER_COLS);
  const end = Math.min(
    TOTAL_COLS - 1,
    firstVisibleIndex + visibleCount + H_BUFFER_COLS
  );

  return { start, end };
}

function SkeletonRow({ dark = false, visibleCols }) {
  const { start, end } = visibleCols;
  const leftSpacerWidth = start * COL_WIDTH;
  const rightSpacerWidth = (TOTAL_COLS - end - 1) * COL_WIDTH;

  return (
    <View
      style={{
        flexDirection: "row",
        width: TABLE_WIDTH,
        height: ROW_HEIGHT,
      }}
    >
      {/* left spacer */}
      {leftSpacerWidth > 0 && (
        <View style={{ width: leftSpacerWidth, height: ROW_HEIGHT }} />
      )}

      {/* only visible skeleton cells */}
      {Array.from({ length: end - start + 1 }).map((_, idx) => {
        const col = start + idx;
        return (
          <View
            key={`sk-${col}`}
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
      })}

      {/* right spacer */}
      {rightSpacerWidth > 0 && (
        <View style={{ width: rightSpacerWidth, height: ROW_HEIGHT }} />
      )}
    </View>
  );
}

function Index() {
  const { width: windowWidth } = useWindowDimensions();

  const [baseItems, setBaseItems] = useState([]);
  const [rowsCount, setRowsCount] = useState(TOTAL_ROWS);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // scroll state (for overlay skeleton)
  const [isScrolling, setIsScrolling] = useState(false);

  // HORIZONTAL virtualization state
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(windowWidth);

  const horizontalScrollTimeoutRef = useRef(null);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
  }).current;

  // keep viewportWidth in sync with screen width (minus padding)
  useEffect(() => {
    // container has padding: 12 left + 12 right = 24
    const effectiveWidth = Math.max(0, windowWidth - 24);
    setViewportWidth(effectiveWidth);
  }, [windowWidth]);

  // Fetch base data for cell labels (API call)
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

  useEffect(() => {
    return () => {
      if (horizontalScrollTimeoutRef.current) {
        clearTimeout(horizontalScrollTimeoutRef.current);
      }
    };
  }, []);

  const getCellLabel = (row, col) => {
    if (!baseItems || baseItems.length === 0) {
      return `R${row} C${col}`;
    }
    const base = baseItems[(row + col) % baseItems.length];
    const baseTitle = base?.title || base?.name || "Item";
    return `${baseTitle} (${row},${col})`;
  };

  // logical rows
  const rows = useMemo(
    () => Array.from({ length: rowsCount }, (_, i) => i),
    [rowsCount]
  );

  // data for FlashList (rows + optional skeleton rows at bottom)
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

  // compute visible columns from horizontal scroll state
  const visibleCols = useMemo(
    () => getVisibleCols(horizontalOffset, viewportWidth),
    [horizontalOffset, viewportWidth]
  );

  // helpful stats
  useEffect(() => {
    console.log("=== GRID SETUP ===");
    console.log("Total logical rows (MAX):", TOTAL_ROWS);
    console.log("Total columns:", TOTAL_COLS);
    console.log("Current rowsCount in list:", rowsCount);
    console.log("==================");
  }, [rowsCount]);

  const renderRow = ({ item }) => {
    if (item.type === "skeleton") {
      return <SkeletonRow visibleCols={visibleCols} />;
    }

    const rowIndex = item.index;
    const { start, end } = visibleCols;

    const leftSpacerWidth = start * COL_WIDTH;
    const rightSpacerWidth = (TOTAL_COLS - end - 1) * COL_WIDTH;

    return (
      <View
        style={{
          flexDirection: "row",
          width: TABLE_WIDTH,
          height: ROW_HEIGHT,
        }}
      >
        {/* left spacer (non-rendered columns before start) */}
        {leftSpacerWidth > 0 && (
          <View style={{ width: leftSpacerWidth, height: ROW_HEIGHT }} />
        )}

        {/* only visible columns */}
        {Array.from({ length: end - start + 1 }).map((_, idx) => {
          const col = start + idx;
          return (
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
          );
        })}

        {/* right spacer (non-rendered columns after end) */}
        {rightSpacerWidth > 0 && (
          <View style={{ width: rightSpacerWidth, height: ROW_HEIGHT }} />
        )}
      </View>
    );
  };

  // Load more rows (kept in case you later start with fewer than TOTAL_ROWS)
  const handleLoadMore = () => {
    if (loadingMore) return;
    if (rowsCount >= TOTAL_ROWS) return;

    setLoadingMore(true);

    setTimeout(() => {
      setRowsCount((prev) => {
        const next = Math.min(prev + PAGE_SIZE, TOTAL_ROWS);
        return next;
      });
      setLoadingMore(false);
    }, 600);
  };

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
        <SkeletonRow visibleCols={visibleCols} />
      </View>
    );
  };

  // horizontal scroll: update state for virtualization + drive isScrolling
  const handleHorizontalScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const width = event.nativeEvent.layoutMeasurement.width; // viewport width

    setHorizontalOffset(offsetX);
    setViewportWidth(width);

    // compute and log visible column range for this scroll event
    const nextVisibleCols = getVisibleCols(offsetX, width);

    console.log("HORIZONTAL SCROLL offsetX:", offsetX, "viewportWidth:", width);
    console.log(
      "HORIZONTAL Visible cols range:",
      nextVisibleCols.start,
      "→",
      nextVisibleCols.end
    );
    console.log(
      "HORIZONTAL first visible col index:",
      nextVisibleCols.start
    );

    if (!isScrolling) setIsScrolling(true);
    if (horizontalScrollTimeoutRef.current) {
      clearTimeout(horizontalScrollTimeoutRef.current);
    }
    horizontalScrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 120); // small delay after last horizontal scroll event
  };

  // 2D virtualization debug: triggered on vertical visibility changes
  const handleViewableItemsChanged = useRef(({ viewableItems }) => {
    const visibleRowIndices = viewableItems
      .filter((v) => v.item.type === "row")
      .map((v) => v.item.index)
      .sort((a, b) => a - b);

    if (visibleRowIndices.length === 0) return;

    const firstVisibleRow = visibleRowIndices[0];
    const lastVisibleRow = visibleRowIndices[visibleRowIndices.length - 1];

    console.log("=== 2D VIRTUALIZATION SNAPSHOT ===");
    console.log("Visible rows count:", visibleRowIndices.length);
    console.log("Visible rows range:", firstVisibleRow, "→", lastVisibleRow);
    console.log(
      "Visible cols count:",
      visibleCols.end - visibleCols.start + 1
    );
    console.log(
      "Visible cols range:",
      visibleCols.start,
      "→",
      visibleCols.end
    );
    console.log(
      "First visible col index:",
      visibleCols.start
    );
    console.log("Visible row indices:", visibleRowIndices);
    console.log("==================================");
  }).current;

  const startVerticalScrolling = () => setIsScrolling(true);
  const stopVerticalScrolling = () => setIsScrolling(false);

  // INITIAL full-screen skeleton grid (respects visibleCols once scroll happens)
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
          onScroll={handleHorizontalScroll}
          scrollEventThrottle={16}
        >
          <View style={{ width: TABLE_WIDTH }}>
            {Array.from({ length: INITIAL_SKELETON_ROWS }).map(
              (_, rowIndex) => (
                <SkeletonRow
                  key={`init-sk-${rowIndex}`}
                  visibleCols={visibleCols}
                />
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
      }}
    >
      {/* OUTER HORIZONTAL SCROLLER – controls horizontal virtualization */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces={false}
        onScroll={handleHorizontalScroll}
        scrollEventThrottle={16}
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
            onScrollBeginDrag={startVerticalScrolling}
            onMomentumScrollBegin={startVerticalScrolling}
            onScrollEndDrag={stopVerticalScrolling}
            onMomentumScrollEnd={stopVerticalScrolling}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            extraData={visibleCols}
          />

          {/* FULL OVERLAY SKELETON WHILE SCROLLING (2D, respects visibleCols)
              Placed INSIDE the horizontally scrolling container so it scrolls with content */}
          {isScrolling && (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              {Array.from({ length: OVERLAY_SKELETON_ROWS }).map(
                (_, rowIndex) => (
                  <SkeletonRow
                    key={`overlay-sk-${rowIndex}`}
                    dark
                    visibleCols={visibleCols}
                  />
                )
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default Index;
