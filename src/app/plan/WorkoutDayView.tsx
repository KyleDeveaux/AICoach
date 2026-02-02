"use client";

import { useState } from "react";
import type {
  WorkoutLogWithDetails,
  SetLogUpdate,
  AddExercisePayload,
  WeeklyWorkoutSession,
  WorkoutExercise,
  ActivityLogRow,
  ActivityIntensity,
} from "../lib/types";
import { normalizeExerciseKey } from "../lib/demoLinkHelpers";
import ExerciseRow from "./ExerciseRow";
import AddExerciseForm from "./AddExerciseForm";
import PlanExerciseEditRow from "./PlanExerciseEditRow";
import PlanAddExerciseForm from "./PlanAddExerciseForm";
import ActivityLogForm from "./ActivityLogForm";
import ActivityLogCard from "./ActivityLogCard";
import WorkoutDemoModal from "../dashboard/WorkoutDemoModal";

type WorkoutDayViewProps = {
  selectedDayName: string;
  plannedWorkout: WeeklyWorkoutSession | null;
  workoutLog: WorkoutLogWithDetails | null;
  onStartWorkout: () => Promise<void>;
  onCompleteWorkout: () => Promise<void>;
  onSetUpdate: (setLogId: string, data: SetLogUpdate) => Promise<void>;
  onAddSet: (exerciseLogId: string) => Promise<void>;
  onDeleteSet: (setLogId: string) => Promise<void>;
  onAddExercise: (exercise: AddExercisePayload) => Promise<void>;
  isStarting: boolean;
  isCompleting: boolean;
  isAddingExercise: boolean;
  // Plan editing
  isEditingPlan: boolean;
  draftWorkout: WeeklyWorkoutSession | null;
  onEnterEditMode: () => void;
  onCancelEdit: () => void;
  onSavePlanEdits: () => Promise<void>;
  onUpdateDraftExercise: (index: number, updates: Partial<WorkoutExercise>) => void;
  onRemoveDraftExercise: (index: number) => void;
  onAddDraftExercise: (exercise: WorkoutExercise) => void;
  onUpdateDraftWorkoutName: (name: string) => void;
  isSavingPlan: boolean;
  planSaveError: string | null;
  // Exercise demo links
  demoMap: Record<string, string>;
  onSaveDemo: (exerciseName: string, url: string) => Promise<void>;
  onRemoveDemo: (exerciseName: string) => Promise<void>;
  isDemoSaving: boolean;
  // Activity logging
  activityLogs: ActivityLogRow[];
  onSaveActivity: (data: {
    activity_name: string;
    duration_minutes: number;
    intensity: ActivityIntensity;
    notes: string | null;
  }) => Promise<void>;
  onDeleteActivity: (id: string) => void;
  isSavingActivity: boolean;
  isDeletingActivityId: string | null;
};

export default function WorkoutDayView({
  selectedDayName,
  plannedWorkout,
  workoutLog,
  onStartWorkout,
  onCompleteWorkout,
  onSetUpdate,
  onAddSet,
  onDeleteSet,
  onAddExercise,
  isStarting,
  isCompleting,
  isAddingExercise,
  isEditingPlan,
  draftWorkout,
  onEnterEditMode,
  onCancelEdit,
  onSavePlanEdits,
  onUpdateDraftExercise,
  onRemoveDraftExercise,
  onAddDraftExercise,
  onUpdateDraftWorkoutName,
  isSavingPlan,
  planSaveError,
  demoMap,
  onSaveDemo,
  onRemoveDemo,
  isDemoSaving,
  activityLogs,
  onSaveActivity,
  onDeleteActivity,
  isSavingActivity,
  isDeletingActivityId,
}: WorkoutDayViewProps) {
  // Demo modal state
  const [demoOpen, setDemoOpen] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState("");

  function openDemo(name: string) {
    setActiveExerciseName(name);
    setDemoOpen(true);
  }

  const activeKey = normalizeExerciseKey(activeExerciseName);
  const activeUrl = demoMap[activeKey] ?? null;

  const isRestDay = !plannedWorkout && !workoutLog;
  const workoutName = workoutLog?.workout_name ?? plannedWorkout?.workoutName ?? "Rest Day";
  const status = workoutLog?.status ?? "not_started";
  const isActive = status === "in_progress";
  const isCompleted = status === "completed";

  // Use exercise list from the log if started, otherwise from plan
  const exerciseLogs = workoutLog?.workout_log_exercises ?? [];
  const sortedExercises = [...exerciseLogs].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  // Planned exercises (when workout not started yet)
  const plannedExercises = plannedWorkout?.exercises ?? [];

  return (
    <div className="glass-card overflow-hidden transition-all duration-200">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {selectedDayName}
            </p>
            {isEditingPlan && draftWorkout ? (
              <input
                type="text"
                value={draftWorkout.workoutName}
                onChange={(e) => onUpdateDraftWorkoutName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-800/50 px-3 py-1.5 text-lg font-bold text-white outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/20"
              />
            ) : (
              <h3 className="mt-1 text-lg font-bold text-white">{workoutName}</h3>
            )}
          </div>

          <div className="ml-3 flex items-center gap-2">
            {/* Edit plan button — only when plan exists, not started, not editing */}
            {!isRestDay && !workoutLog && !isEditingPlan && plannedWorkout && (
              <button
                type="button"
                onClick={onEnterEditMode}
                className="rounded-lg border border-white/10 bg-slate-800/50 p-2 text-slate-400 transition-all duration-200 hover:border-white/20 hover:text-white"
                aria-label="Edit workout plan"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
                  />
                </svg>
              </button>
            )}

            {/* Status badge */}
            {(!isRestDay || workoutLog) && !isEditingPlan && (
              <div
                className={[
                  "rounded-full px-3 py-1 text-xs font-bold",
                  isCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : isActive
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-800/50 text-slate-500",
                ].join(" ")}
              >
                {isCompleted
                  ? "Completed"
                  : isActive
                    ? "In Progress"
                    : "Not Started"}
              </div>
            )}

            {/* Editing badge */}
            {isEditingPlan && (
              <div className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-400">
                Editing
              </div>
            )}
          </div>
        </div>

        {/* Rest day */}
        {isRestDay && (
          <div className="mt-6 rounded-lg bg-slate-800/50 p-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-white/10"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            <p className="mt-4 text-sm font-bold text-slate-400">Rest Day</p>
            <p className="mt-1 text-xs text-slate-600">
              No workout scheduled — rest up and recover!
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={onStartWorkout}
                disabled={isStarting}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800/50 px-5 py-2.5 text-sm font-bold text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-slate-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                {isStarting ? "Starting..." : "Start Custom Workout"}
              </button>
            </div>
          </div>
        )}

        {/* Not started: show planned exercises as preview (read-only) */}
        {!isRestDay && !workoutLog && !isEditingPlan && (
          <>
            <div className="mt-5 space-y-2">
              {plannedExercises.map((ex, idx) => {
                const key = normalizeExerciseKey(ex.name);
                const hasDemo = Boolean(demoMap[key]);

                return (
                  <button
                    key={`${ex.name}-${idx}`}
                    type="button"
                    onClick={() => openDemo(ex.name)}
                    className="flex w-full items-center gap-3 rounded-lg border border-white/5 bg-slate-800/30 px-4 py-3 text-left transition-all duration-200 hover:border-white/10 hover:bg-slate-800/50"
                    style={{
                      animation: `slideInX 0.3s ease-out ${idx * 0.05}s both`,
                    }}
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-800/50 text-xs font-bold text-slate-400">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-white">
                          {ex.name}
                        </p>
                        {hasDemo && (
                          <span className="flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            Demo
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {ex.sets} x {ex.reps}
                    </span>
                    <svg className="h-4 w-4 flex-shrink-0 text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Start workout button */}
            <div className="mt-6">
              <button
                type="button"
                onClick={onStartWorkout}
                disabled={isStarting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                </svg>
                {isStarting ? "Starting..." : "Start Workout"}
              </button>
            </div>
          </>
        )}

        {/* Edit mode: editable exercise rows */}
        {!isRestDay && !workoutLog && isEditingPlan && draftWorkout && (
          <>
            <div className="mt-5 space-y-2">
              {draftWorkout.exercises.map((ex, idx) => (
                <PlanExerciseEditRow
                  key={`edit-${idx}`}
                  exercise={ex}
                  index={idx}
                  onUpdate={(updates) => onUpdateDraftExercise(idx, updates)}
                  onRemove={() => onRemoveDraftExercise(idx)}
                />
              ))}
            </div>

            {/* Add exercise to plan */}
            <div className="mt-4">
              <PlanAddExerciseForm onAdd={onAddDraftExercise} />
            </div>

            {/* Error message */}
            {planSaveError && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2">
                <svg
                  className="h-4 w-4 text-rose-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-xs font-medium text-rose-300">{planSaveError}</p>
              </div>
            )}

            {/* Save / Cancel buttons */}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={onCancelEdit}
                disabled={isSavingPlan}
                className="flex-1 rounded-lg border border-white/10 bg-slate-800/50 px-4 py-3 text-sm font-bold text-slate-300 transition-all duration-200 hover:border-white/20 hover:bg-slate-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSavePlanEdits}
                disabled={isSavingPlan || draftWorkout.exercises.length === 0}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingPlan ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </>
        )}

        {/* Active or completed: show exercise rows with tracking */}
        {!isRestDay && workoutLog && (
          <>
            <div className="mt-5 space-y-3">
              {sortedExercises.map((exLog, idx) => (
                <ExerciseRow
                  key={exLog.id}
                  exerciseLog={exLog}
                  exerciseIndex={idx}
                  isWorkoutActive={isActive}
                  onSetUpdate={onSetUpdate}
                  onAddSet={onAddSet}
                  onDeleteSet={onDeleteSet}
                  demoUrl={demoMap[normalizeExerciseKey(exLog.exercise_name)] ?? null}
                  onOpenDemo={openDemo}
                />
              ))}
            </div>

            {/* Add exercise (only when in_progress) */}
            {isActive && (
              <div className="mt-4">
                <AddExerciseForm
                  onAdd={onAddExercise}
                  isAdding={isAddingExercise}
                />
              </div>
            )}

            {/* Complete workout button */}
            {isActive && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onCompleteWorkout}
                  disabled={isCompleting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {isCompleting ? "Completing..." : "Complete Workout"}
                </button>
              </div>
            )}

            {/* Completed summary */}
            {isCompleted && workoutLog.completed_at && (
              <div className="mt-5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-xs font-medium text-emerald-300">
                    Workout completed at{" "}
                    {new Date(workoutLog.completed_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
        {/* ── Activity Logging Section ── */}
        <div className="mt-6 border-t border-white/5 pt-6">
          {activityLogs.length > 0 && (
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              Activities
            </p>
          )}

          {activityLogs.length > 0 && (
            <div className="mb-4 space-y-2">
              {activityLogs.map((activity) => (
                <ActivityLogCard
                  key={activity.id}
                  activity={activity}
                  onDelete={onDeleteActivity}
                  isDeleting={isDeletingActivityId === activity.id}
                />
              ))}
            </div>
          )}

          <ActivityLogForm
            onSave={onSaveActivity}
            isSaving={isSavingActivity}
          />
        </div>
      </div>

      <WorkoutDemoModal
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        exerciseName={activeExerciseName}
        initialUrl={activeUrl}
        onSave={onSaveDemo}
        onRemove={onRemoveDemo}
        isSaving={isDemoSaving}
      />
    </div>
  );
}
