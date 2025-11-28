import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const TOTAL_ROWS = 10000;
const TOTAL_COLS = 100;
const ROW_HEIGHT = 40;
const COL_WIDTH = 120;
const BUFFER = 3;

export default function Index() {
  const [baseItems, setBaseItems] = useState([]);
  const [scrollState, setScrollState] = useState({
    offsetX: 0,
    offsetY: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("https://dummyjson.com/products?limit=200");
        const json = await res.json();
        setBaseItems(json.products || []);
      } catch (e) {
        console.error("Error fetching data", e);
      }
    };
    load();
  }, []);

  const { offsetX, offsetY, viewportWidth, viewportHeight } = scrollState;

  const startRow = Math.max(Math.floor(offsetY / ROW_HEIGHT) - BUFFER, 0);
  const startCol = Math.max(Math.floor(offsetX / COL_WIDTH) - BUFFER, 0);

  const visibleRowCount =
    Math.ceil((viewportHeight || 0) / ROW_HEIGHT) + 2 * BUFFER;
  const visibleColCount =
    Math.ceil((viewportWidth || 0) / COL_WIDTH) + 2 * BUFFER;

  const endRow = Math.min(startRow + visibleRowCount, TOTAL_ROWS - 1);
  const endCol = Math.min(startCol + visibleColCount, TOTAL_COLS - 1);

  const rows = [];
  for (let r = startRow; r <= endRow; r++) rows.push(r);

  const cols = [];
  for (let c = startCol; c <= endCol; c++) cols.push(c);

  const getCellLabel = (row, col) => {
    if (!baseItems || baseItems.length === 0) {
      return `R${row} C${col}`;
    }
    const base = baseItems[(row + col) % baseItems.length];
    const baseTitle = base?.title || base?.name || "Item";
    return `${baseTitle} (${row},${col})`;
  };

  return (
    <View className="flex-1 bg-white">
      {/* BOTH SCROLLS ACTIVE */}
      <ScrollView
        horizontal
        scrollEventThrottle={16}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement } = e.nativeEvent;
          setScrollState((prev) => ({
            ...prev,
            offsetX: contentOffset.x,
            viewportWidth: layoutMeasurement.width,
          }));
        }}
      >
        <ScrollView
          scrollEventThrottle={16}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement } = e.nativeEvent;
            setScrollState((prev) => ({
              ...prev,
              offsetY: contentOffset.y,
              viewportHeight: layoutMeasurement.height,
            }));
          }}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            setScrollState((prev) => ({
              ...prev,
              viewportWidth: width,
              viewportHeight: height,
            }));
          }}
        >
          <View
            style={{
              width: TOTAL_COLS * COL_WIDTH,
              height: TOTAL_ROWS * ROW_HEIGHT,
            }}
          >
            {rows.map((row) =>
              cols.map((col) => (
                <View
                  key={`${row}-${col}`}
                  className="absolute border border-gray-200 items-center justify-center bg-white"
                  style={{
                    top: row * ROW_HEIGHT,
                    left: col * COL_WIDTH,
                    width: COL_WIDTH,
                    height: ROW_HEIGHT,
                  }}
                >
                  <Text className="text-[10px]" numberOfLines={1}>
                    {getCellLabel(row, col)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}
