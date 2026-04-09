import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Box, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import { FaPause, FaPlay, FaRotateLeft } from "react-icons/fa6";

const WORK_DURATION_SECONDS = 25 * 60;
const BREAK_DURATION_SECONDS = 5 * 60;
const STORAGE_KEY = "obsidian-pomodoro-timer";

type PomodoroPhase = "work" | "break";

type TimerState = {
  phase: PomodoroPhase;
  isRunning: boolean;
  remainingSeconds: number;
  endTime: number | null;
};

function getPhaseDuration(phase: PomodoroPhase): number {
  return phase === "work" ? WORK_DURATION_SECONDS : BREAK_DURATION_SECONDS;
}

function getNextPhase(phase: PomodoroPhase): PomodoroPhase {
  return phase === "work" ? "break" : "work";
}

function createTimerState(phase: PomodoroPhase, isRunning: boolean, remainingSeconds: number): TimerState {
  return {
    phase,
    isRunning,
    remainingSeconds,
    endTime: isRunning ? Date.now() + remainingSeconds * 1000 : null,
  };
}

function loadStoredState(): TimerState {
  const fallbackState = createTimerState("work", false, WORK_DURATION_SECONDS);
  const rawState = localStorage.getItem(STORAGE_KEY);

  if (!rawState) {
    return fallbackState;
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<TimerState>;
    const phase = parsed.phase === "break" ? "break" : "work";
    const isRunning = parsed.isRunning === true;
    const remainingSeconds = typeof parsed.remainingSeconds === "number"
      ? Math.max(0, Math.floor(parsed.remainingSeconds))
      : getPhaseDuration(phase);
    const endTime = typeof parsed.endTime === "number" ? parsed.endTime : null;

    if (!isRunning || endTime === null) {
      return {
        phase,
        isRunning: false,
        remainingSeconds,
        endTime: null,
      };
    }

    return {
      phase,
      isRunning: true,
      remainingSeconds: Math.max(0, Math.ceil((endTime - Date.now()) / 1000)),
      endTime,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return fallbackState;
  }
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

async function resumeAudioContext(audioContextRef: MutableRefObject<AudioContext | null>): Promise<void> {
  const audioContext = audioContextRef.current ?? new AudioContext();
  audioContextRef.current = audioContext;

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

function playCompletionBeep(audioContextRef: MutableRefObject<AudioContext | null>): void {
  const audioContext = audioContextRef.current ?? new AudioContext();
  audioContextRef.current = audioContext;

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.35);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.35);
}

export default function PomodoroTimer() {
  const [timerState, setTimerState] = useState<TimerState>(() => loadStoredState());
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerDisplay = useMemo(() => formatTime(timerState.remainingSeconds), [timerState.remainingSeconds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timerState));
  }, [timerState]);

  useEffect(() => {
    if (!timerState.isRunning || timerState.endTime === null) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const nextRemainingSeconds = Math.max(0, Math.ceil((timerState.endTime as number - Date.now()) / 1000));

      if (nextRemainingSeconds > 0) {
        setTimerState((currentState) => (
          currentState.remainingSeconds === nextRemainingSeconds
            ? currentState
            : { ...currentState, remainingSeconds: nextRemainingSeconds }
        ));
        return;
      }

      window.clearInterval(intervalId);
      const nextPhase = getNextPhase(timerState.phase);
      const nextDuration = getPhaseDuration(nextPhase);

      setTimerState({
        phase: nextPhase,
        isRunning: true,
        remainingSeconds: nextDuration,
        endTime: Date.now() + nextDuration * 1000,
      });

      try {
        playCompletionBeep(audioContextRef);
      } catch (error) {
        console.error("Unable to play pomodoro timer beep", error);
      }
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [timerState.endTime, timerState.isRunning, timerState.phase]);

  const startTimer = async () => {
    try {
      await resumeAudioContext(audioContextRef);
    } catch (error) {
      console.error("Unable to prepare pomodoro timer audio", error);
    }

    setTimerState((currentState) => {
      if (currentState.isRunning) {
        return currentState;
      }

      return {
        ...currentState,
        isRunning: true,
        endTime: Date.now() + currentState.remainingSeconds * 1000,
      };
    });
  };

  const pauseTimer = () => {
    setTimerState((currentState) => {
      if (!currentState.isRunning || currentState.endTime === null) {
        return currentState;
      }

      return {
        ...currentState,
        isRunning: false,
        remainingSeconds: Math.max(0, Math.ceil((currentState.endTime - Date.now()) / 1000)),
        endTime: null,
      };
    });
  };

  const resetTimer = () => {
    setTimerState(createTimerState(timerState.phase, false, getPhaseDuration(timerState.phase)));
  };

  const cycleTimerLength = () => {
    setTimerState((currentState) => {
      const nextPhase = getNextPhase(currentState.phase);
      return createTimerState(nextPhase, false, getPhaseDuration(nextPhase));
    });
  };

  return (
    <Box
      sx={{
        justifySelf: "center",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Stack
        direction="row"
        spacing={0.25}
        alignItems="center"
        sx={{
          px: 0.75,
          py: 0.5,
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.07)",
          backgroundColor: "#141414",
        }}
      >
        <Box
          component="button"
          onClick={cycleTimerLength}
          sx={{
            border: 0,
            backgroundColor: "transparent",
            color: "text.primary",
            cursor: "pointer",
            borderRadius: "6px",
            px: 1,
            py: 0.5,
            minWidth: 72,
            transition: "background-color 150ms ease-out, color 150ms ease-out",
            "&:hover": {
              backgroundColor: "rgba(255,255,255,0.04)",
            },
            "&:focus-visible": {
              outline: "2px solid #e0e0e0",
              outlineOffset: 2,
            },
          }}
          aria-label="Cycle pomodoro timer length"
          title="Cycle between 25 and 5 minutes"
        >
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
            {timerDisplay}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.25} alignItems="center">
          <Tooltip title={timerState.isRunning ? "Pause timer" : "Start timer"}>
            <IconButton
              size="small"
              onClick={timerState.isRunning ? pauseTimer : startTimer}
              aria-label={timerState.isRunning ? "Pause pomodoro timer" : "Start pomodoro timer"}
            >
              {timerState.isRunning ? <FaPause size={12} /> : <FaPlay size={12} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Reset timer">
            <IconButton size="small" onClick={resetTimer} aria-label="Reset pomodoro timer">
              <FaRotateLeft size={12} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>
    </Box>
  );
}
