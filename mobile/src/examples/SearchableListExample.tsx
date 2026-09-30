/**
 * Example 2: Search with Infinite Scroll
 * Shows: Combining search filters with pagination
 */

import React, { useState, useMemo, useCallback } from "react";
import { View, SafeAreaView, TextInput } from "react-native";
import { useInfiniteScroll } from "../hooks/useInfiniteScroll";
import { InfiniteScrollList } from "../components/InfiniteScrollList";

export interface User {
  id: string;
  name: string;
  email: string;
}

const mockApiGetUsers = async (
  page: number,
  pageSize: number
): Promise<User[]> => {
  await new Promise((resolve) => setTimeout(resolve, 400));

  const users: User[] = [];
  for (let i = 0; i < pageSize; i++) {
    const index = (page - 1) * pageSize + i;
    users.push({
      id: `user-${index}`,
      name: `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
    });
  }

  return users.length === pageSize ? users : [];
};

export function SearchableListExample() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, loadMore, refresh } = useInfiniteScroll({
    pageSize: 25,
    maxItems: 500,
    onLoadMore: mockApiGetUsers,
  });

  // Filter data locally
  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return data.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  const renderUser = useCallback((user: User) => {
    return (
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
        <View style={{ fontWeight: "bold" }}>{user.name}</View>
        <View style={{ color: "#6b7280", marginTop: 4 }}>{user.email}</View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <TextInput
        style={{
          margin: 12,
          padding: 12,
          borderWidth: 1,
          borderRadius: 8,
          borderColor: "#d1d5db",
        }}
        placeholder="Search users..."
        value={searchQuery}
        onChangeText={setSearchQuery}
      />
      <InfiniteScrollList
        infiniteConfig={{
          pageSize: 25,
          maxItems: 500,
          onLoadMore: mockApiGetUsers,
        }}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        estimatedItemSize={80}
      />
    </SafeAreaView>
  );
}
