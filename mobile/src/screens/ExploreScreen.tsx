/**
 * ExploreScreen — discovery screen for bounties and creators.
 *
 * Provides a structured layout using the standard ScreenLayout primitives
 * (issue #1351) so the frame-drop risk from custom per-screen boilerplate
 * is eliminated.  Sections are rendered via SectionHeader + ContentCard so
 * the visual language matches every other screen.
 *
 * Related: #1351
 */

import React, { useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ScreenLayout,
  SectionHeader,
  ContentCard,
  EmptyScreenState,
  LoadingScreen,
} from "../components/layouts";
import { useTheme } from "../theme/ThemeProvider";
import { FontSize, FontWeight, Radius, Spacing } from "../theme/tokens";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExploreItem {
  id: string;
  title: string;
  meta: string;
  tag: string;
}

// ---------------------------------------------------------------------------
// Static demo data (replaced by API call once backend is wired)
// ---------------------------------------------------------------------------

const TRENDING_BOUNTIES: ExploreItem[] = [
  { id: "b1", title: "Brand identity for DeFi startup",  meta: "500 XLM · 5 days left",  tag: "Design" },
  { id: "b2", title: "Copy-write landing page refresh",  meta: "200 XLM · 3 days left",  tag: "Writing" },
  { id: "b3", title: "Product roadmap for mobile app",   meta: "350 XLM · 7 days left",  tag: "PM" },
];

const FEATURED_CREATORS: ExploreItem[] = [
  { id: "c1", title: "Luna Arts",     meta: "UI/UX Design · 4.9★",  tag: "Design" },
  { id: "c2", title: "Stellar Labs",  meta: "Marketing · 4.8★",     tag: "Marketing" },
  { id: "c3", title: "NovaCopy",     meta: "Content · 4.7★",        tag: "Writing" },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TagBadge({ label, color }: { label: string; color: string }): React.JSX.Element {
  return (
    <View style={[styles.tag, { backgroundColor: color + "22" }]}>
      <Text style={[styles.tagLabel, { color }]}>{label}</Text>
    </View>
  );
}

function ExploreCard({
  item,
  onPress,
}: {
  item: ExploreItem;
  onPress: () => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <ContentCard onPress={onPress} style={styles.exploreCard}>
      <View style={styles.cardRow}>
        <View style={styles.cardText}>
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {item.meta}
          </Text>
        </View>
        <TagBadge label={item.tag} color={colors.primary} />
      </View>
    </ContentCard>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export function ExploreScreen(): React.JSX.Element {
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [loading] = useState(false);

  const filteredBounties = TRENDING_BOUNTIES.filter((b) =>
    b.title.toLowerCase().includes(query.toLowerCase()),
  );
  const filteredCreators = FEATURED_CREATORS.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()),
  );

  if (loading) return <LoadingScreen message="Loading explore feed…" />;

  return (
    <ScreenLayout scrollable padded testID="explore-screen">
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.card, borderColor: colors.border ?? colors.textSecondary + "33" },
        ]}
        accessibilityRole="search"
      >
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search bounties, creators…"
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Bounties section */}
      <SectionHeader
        title="Trending Bounties"
        subtitle="Short-term projects open now"
        rightAction={
          <Pressable
            onPress={() => router.push("/(app)/bounties" as never)}
            accessibilityRole="link"
            accessibilityLabel="See all bounties"
          >
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        }
      />

      {filteredBounties.length === 0 ? (
        <EmptyScreenState
          title="No bounties found"
          message={`No results for "${query}"`}
          actionLabel="Clear search"
          onAction={() => setQuery("")}
        />
      ) : (
        <FlatList
          data={filteredBounties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExploreCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(app)/bounty-detail" as never,
                  params: { id: item.id },
                })
              }
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing[3] }} />}
        />
      )}

      {/* Creators section */}
      <SectionHeader
        title="Featured Creators"
        subtitle="Top-rated professionals"
        style={styles.creatorsHeader}
        rightAction={
          <Pressable
            onPress={() => router.push("/(app)/creators" as never)}
            accessibilityRole="link"
            accessibilityLabel="See all creators"
          >
            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
          </Pressable>
        }
      />

      {filteredCreators.length === 0 ? null : (
        <FlatList
          data={filteredCreators}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExploreCard
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/(app)/creator" as never,
                  params: { id: item.id },
                })
              }
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: Spacing[3] }} />}
        />
      )}
    </ScreenLayout>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  searchBar: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing[5],
    paddingHorizontal: Spacing[3],
  },
  searchInput: {
    height: 44,
    fontSize: FontSize.base,
  },
  exploreCard: {
    marginBottom: 0,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing[3],
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing[1],
  },
  cardMeta: {
    fontSize: FontSize.sm,
  },
  tag: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: "flex-start",
  },
  tagLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  creatorsHeader: {
    marginTop: Spacing[6],
  },
});
