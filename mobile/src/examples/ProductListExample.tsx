/**
 * Example 1: Product List with Infinite Scroll
 * Shows: Basic infinite scroll with FlatList
 */

import React, { useCallback } from "react";
import { View, SafeAreaView } from "react-native";
import { InfiniteScrollList } from "../components/InfiniteScrollList";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
}

// Mock API
const mockApiGetProducts = async (
  page: number,
  pageSize: number
): Promise<Product[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate mock data
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

  // Simulate "no more items" after 100 items
  if ((page - 1) * pageSize >= 100) {
    return [];
  }

  return items;
};

export function ProductListExample() {
  const renderProduct = useCallback((product: Product) => {
    return (
      <View
        style={{
          padding: 12,
          backgroundColor: "#f3f4f6",
          marginHorizontal: 12,
          marginVertical: 6,
          borderRadius: 8,
        }}
      >
        <View style={{ fontSize: 16, fontWeight: "bold" }}>
          {product.name}
        </View>
        <View style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          ${product.price}
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <InfiniteScrollList
        infiniteConfig={{
          pageSize: 20,
          maxItems: 300,
          onLoadMore: mockApiGetProducts,
        }}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        itemHeight={80}
        scrollThreshold={0.7}
      />
    </SafeAreaView>
  );
}
