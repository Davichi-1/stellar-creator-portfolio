/**
 * Example 4: With Error Handling and Retry
 * Shows: Error states and recovery
 */

import React, { useCallback } from "react";
import { View, SafeAreaView } from "react-native";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { InfiniteScrollList } from "../components/InfiniteScrollList";
import type { Product } from "./ProductListExample";

export interface ApiResponse<T> {
  items: T[];
  error?: string;
}

const mockApiWithErrors = async (
  page: number,
  pageSize: number
): Promise<Product[]> => {
  // Simulate occasional network errors
  if (Math.random() > 0.8) {
    throw new Error("Network request failed");
  }

  await new Promise((resolve) => setTimeout(resolve, 500));

  const items: Product[] = [];
  for (let i = 0; i < pageSize; i++) {
    const index = (page - 1) * pageSize + i;
    items.push({
      id: `product-${index}`,
      name: `Product ${index + 1}`,
      price: Math.floor(Math.random() * 10000) / 100,
      image: `https://via.placeholder.com/200`,
    });
  }

  return items;
};

export function ErrorHandlingExample() {
  const { data, error, loadMore, refresh } = useInfiniteScroll({
    pageSize: 20,
    maxItems: 300,
    onLoadMore: mockApiWithErrors,
    onError: (error) => {
      console.error("Failed to load items:", error.message);
    },
  });

  const renderProduct = useCallback((product: Product) => {
    return (
      <View style={{ padding: 12, backgroundColor: "#f3f4f6", margin: 6 }}>
        <View style={{ fontWeight: "bold" }}>{product.name}</View>
        <View style={{ color: "#6b7280", marginTop: 4 }}>${product.price}</View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {error && (
        <View style={{ backgroundColor: "#fee", padding: 12, margin: 12 }}>
          <View style={{ color: "#c00", fontWeight: "bold" }}>Error</View>
          <View style={{ color: "#c00", marginTop: 4 }}>{error.message}</View>
          <View
            onPress={loadMore}
            style={{
              marginTop: 8,
              padding: 8,
              backgroundColor: "#c00",
              borderRadius: 4,
            }}
          >
            <View style={{ color: "white", fontWeight: "bold" }}>Retry</View>
          </View>
        </View>
      )}
      <InfiniteScrollList
        infiniteConfig={{
          pageSize: 20,
          maxItems: 300,
          onLoadMore: mockApiWithErrors,
        }}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        itemHeight={80}
        errorComponent={(error, retry) => (
          <View style={{ padding: 20, alignItems: "center" }}>
            <View style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
              Failed to load more items
            </View>
            <View style={{ color: "#6b7280", marginBottom: 16 }}>
              {error.message}
            </View>
            <View
              onPress={retry}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: "#4f46e5",
                borderRadius: 6,
              }}
            >
              <View style={{ color: "white", fontWeight: "bold" }}>Retry</View>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
