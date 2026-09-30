/**
 * Example 5: Memory-Aware Pagination
 * Shows: Using usePagination hook with memory monitoring
 */

import React, { useCallback } from "react";
import { View, SafeAreaView } from "react-native";
import { usePagination } from "../hooks/usePagination";

export interface Item {
  id: string;
  title: string;
  content: string;
}

export function MemoryAwareExample() {
  const {
    items,
    currentPage,
    isLoading,
    nextPage,
    reset,
    getMemoryStats,
  } = usePagination({
    pageSize: 30,
    maxItems: 500,
    enableMemoryManagement: true,
  });

  const handleLoadMore = useCallback(() => {
    nextPage(async (page, pageSize) => {
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Generate items
      const newItems: Item[] = [];
      for (let i = 0; i < pageSize; i++) {
        const index = (page - 1) * pageSize + i;
        newItems.push({
          id: `item-${index}`,
          title: `Item ${index + 1}`,
          content: "Lorem ipsum dolor sit amet...",
        });
      }

      return newItems;
    });
  }, [nextPage]);

  const stats = getMemoryStats();

  const renderItem = useCallback((item: Item) => {
    return (
      <View style={{ padding: 12, backgroundColor: "#f3f4f6", margin: 8 }}>
        <View style={{ fontWeight: "bold" }}>{item.title}</View>
        <View style={{ color: "#6b7280", marginTop: 4 }}>{item.content}</View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Memory stats */}
      <View style={{ padding: 12, backgroundColor: "#eff6ff", borderBottomWidth: 1 }}>
        <View style={{ fontSize: 12, color: "#0c4a6e" }}>
          Page: {currentPage} | Items: {items.length} | Memory: {stats.estimatedMemoryUsage}
        </View>
      </View>

      {/* Items list */}
      <View style={{ flex: 1 }}>
        {items.map((item) => (
          <View key={item.id}>{renderItem(item)}</View>
        ))}

        {!isLoading && (
          <View
            onPress={handleLoadMore}
            style={{
              padding: 16,
              alignItems: "center",
              backgroundColor: "#4f46e5",
              margin: 12,
              borderRadius: 8,
            }}
          >
            <View style={{ color: "white", fontWeight: "bold" }}>Load More</View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
