/**
 * Example 3: Large Dataset with VirtualizedList
 * Shows: Using VirtualizedScrollList for 1000+ items
 */

import React, { useCallback } from "react";
import { View, SafeAreaView } from "react-native";
import { VirtualizedScrollList } from "../components/VirtualizedScrollList";
import { formatDate } from "../utils";

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  date: string;
}

const mockApiGetArticles = async (
  page: number,
  pageSize: number
): Promise<Article[]> => {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const articles: Article[] = [];
  for (let i = 0; i < pageSize; i++) {
    const index = (page - 1) * pageSize + i;
    articles.push({
      id: `article-${index}`,
      title: `Article ${index + 1}: Interesting Topic`,
      excerpt: `This is a brief excerpt from article ${index + 1}...`,
      date: formatDate(new Date(Date.now() - Math.random() * 100 * 24 * 60 * 60 * 1000)),
    });
  }

  return articles;
};

export function LargeDatasetExample() {
  const renderArticle = useCallback((article: Article) => {
    return (
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
        <View style={{ fontWeight: "bold", fontSize: 16 }}>{article.title}</View>
        <View style={{ color: "#6b7280", marginTop: 8 }}>{article.excerpt}</View>
        <View style={{ color: "#9ca3af", fontSize: 12, marginTop: 8 }}>
          {article.date}
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <VirtualizedScrollList
        infiniteConfig={{
          pageSize: 50,
          maxItems: 1000,
          onLoadMore: mockApiGetArticles,
        }}
        renderItem={renderArticle}
        keyExtractor={(item) => item.id}
        itemHeight={120}
        windowSize={15}
      />
    </SafeAreaView>
  );
}
