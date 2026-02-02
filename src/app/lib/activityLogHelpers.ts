"use client";

import { supabase } from "./supabaseClient";
import type { ActivityLogRow, ActivityLogInsert } from "./types";

/**
 * Fetch all activity logs for a given profile within a date range.
 */
export async function fetchWeekActivityLogs(
  profileId: string,
  weekStart: string,
  weekEnd: string
): Promise<ActivityLogRow[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("profile_id", profileId)
    .gte("activity_date", weekStart)
    .lte("activity_date", weekEnd)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ActivityLogRow[];
}

/**
 * Insert a new activity log.
 */
export async function createActivityLog(
  insert: ActivityLogInsert
): Promise<ActivityLogRow> {
  const { data, error } = await supabase
    .from("activity_logs")
    .insert(insert)
    .select()
    .single();

  if (error) throw error;
  return data as ActivityLogRow;
}

/**
 * Delete an activity log by ID.
 */
export async function deleteActivityLog(
  activityLogId: string
): Promise<void> {
  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", activityLogId);

  if (error) throw error;
}
