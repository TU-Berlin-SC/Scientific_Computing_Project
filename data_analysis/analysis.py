from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd


# -----------------------------
# Core parsing + cleanup
# -----------------------------


def _coerce_win(col: pd.Series) -> pd.Series:
    if col.dtype == bool:
        return col
    return (
        col.astype(str)
        .str.strip()
        .str.lower()
        .map({"true": True, "false": False, "1": True, "0": False})
    )


def load_runs(csv_path: str | Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

    required = [
        "algorithm",
        "objective",
        "dims",
        "seed",
        "win",
        "clicks",
        "time_ms",
        "guesses",
        "completion",
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Types
    df["win"] = _coerce_win(df["win"])
    for c in ["seed", "clicks", "time_ms", "guesses", "completion"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")

    # Drop broken rows
    df = df.dropna(
        subset=[
            "algorithm",
            "objective",
            "dims",
            "seed",
            "win",
            "clicks",
            "time_ms",
            "guesses",
            "completion",
        ]
    )

    # Standardize strings a bit
    for c in ["algorithm", "objective", "dims"]:
        df[c] = df[c].astype(str).str.strip()

    # Derived per-run metrics
    clicks_nonzero = df["clicks"].replace(0, np.nan)
    df["time_per_click_ms"] = df["time_ms"] / clicks_nonzero
    df["completion_per_click"] = (
        df["completion"] / clicks_nonzero
    )  # completion is percent points per click
    df["guess_rate"] = df["guesses"] / clicks_nonzero

    return df


# -----------------------------
# Analysis tables
# -----------------------------


def summary_by_combo(df: pd.DataFrame) -> pd.DataFrame:
    group_cols = ["algorithm", "objective", "dims"]
    out = (
        df.groupby(group_cols, dropna=False)
        .agg(
            runs=("seed", "count"),
            success_ratio=("win", "mean"),
            success_pct=("win", lambda s: 100.0 * s.mean()),
            avg_clicks=("clicks", "mean"),
            avg_time_ms=("time_ms", "mean"),
            avg_guesses=("guesses", "mean"),
            avg_completion=("completion", "mean"),
            avg_time_per_click_ms=("time_per_click_ms", "mean"),
            avg_completion_per_click=("completion_per_click", "mean"),
            avg_guess_rate=("guess_rate", "mean"),
        )
        .reset_index()
        .sort_values(["dims", "algorithm", "objective"], kind="stable")
    )
    return out


def efficiency_on_wins(df: pd.DataFrame) -> pd.DataFrame:
    wins = df[df["win"] == True]
    group_cols = ["algorithm", "objective", "dims"]
    out = (
        wins.groupby(group_cols, dropna=False)
        .agg(
            wins=("seed", "count"),
            clicks_to_win=("clicks", "mean"),
            time_to_win_ms=("time_ms", "mean"),
            guesses_to_win=("guesses", "mean"),
            time_per_click_on_win_ms=("time_per_click_ms", "mean"),
            completion_on_win=(
                "completion",
                "mean",
            ),  # should be ~100 if win means solved
        )
        .reset_index()
        .sort_values(["dims", "algorithm", "objective"], kind="stable")
    )
    return out


def loss_quality(df: pd.DataFrame) -> pd.DataFrame:
    losses = df[df["win"] == False]
    group_cols = ["algorithm", "objective", "dims"]
    out = (
        losses.groupby(group_cols, dropna=False)
        .agg(
            losses=("seed", "count"),
            avg_completion_on_loss=("completion", "mean"),
            avg_clicks_on_loss=("clicks", "mean"),
            avg_guesses_on_loss=("guesses", "mean"),
            avg_guess_rate_on_loss=("guess_rate", "mean"),
            avg_time_ms_on_loss=("time_ms", "mean"),
        )
        .reset_index()
        .sort_values(["dims", "algorithm", "objective"], kind="stable")
    )
    return out


def seed_stability(df: pd.DataFrame) -> pd.DataFrame:
    # win rate per seed, then std/mean across seeds per combo
    per_seed = (
        df.groupby(["algorithm", "objective", "dims", "seed"], dropna=False)
        .agg(win_rate=("win", "mean"))
        .reset_index()
    )

    out = (
        per_seed.groupby(["algorithm", "objective", "dims"], dropna=False)
        .agg(
            seeds=("seed", "count"),
            mean_win=("win_rate", "mean"),
            win_std=("win_rate", "std"),
            win_min=("win_rate", "min"),
            win_max=("win_rate", "max"),
        )
        .reset_index()
        .sort_values(["dims", "algorithm", "objective"], kind="stable")
    )

    # std can be NaN if only 1 seed; replace with 0 for convenience
    out["win_std"] = out["win_std"].fillna(0.0)
    return out


def objective_sensitivity(df: pd.DataFrame) -> pd.DataFrame:
    # For each (algorithm, dims), how much do objectives change success and other metrics?
    base = (
        df.groupby(["algorithm", "dims", "objective"], dropna=False)
        .agg(
            success=("win", "mean"),
            time_per_click=("time_per_click_ms", "mean"),
            completion_per_click=("completion_per_click", "mean"),
            guess_rate=("guess_rate", "mean"),
        )
        .reset_index()
    )

    def spread(g: pd.DataFrame) -> pd.Series:
        return pd.Series(
            {
                "success_range": float(g["success"].max() - g["success"].min()),
                "time_per_click_range": float(
                    g["time_per_click"].max() - g["time_per_click"].min()
                ),
                "completion_per_click_range": float(
                    g["completion_per_click"].max() - g["completion_per_click"].min()
                ),
                "guess_rate_range": float(
                    g["guess_rate"].max() - g["guess_rate"].min()
                ),
            }
        )

    out = (
        base.groupby(["algorithm", "dims"], dropna=False)
        .apply(spread)
        .reset_index()
        .sort_values(["dims", "algorithm"], kind="stable")
    )
    return out


def board_difficulty(df: pd.DataFrame) -> pd.DataFrame:
    # Difficulty per (dims, seed): average success across all combos + average completion
    out = (
        df.groupby(["dims", "seed"], dropna=False)
        .agg(
            avg_success=("win", "mean"),
            avg_success_pct=("win", lambda s: 100.0 * s.mean()),
            avg_completion=("completion", "mean"),
            avg_clicks=("clicks", "mean"),
            avg_time_ms=("time_ms", "mean"),
        )
        .reset_index()
        .sort_values(["dims", "avg_success", "avg_completion"], kind="stable")
    )
    return out


# -----------------------------
# Pareto front (optional but fun)
# -----------------------------


@dataclass(frozen=True)
class ParetoConfig:
    # Higher is better:
    success_ratio: bool = True
    # Lower is better:
    avg_time_per_click_ms: bool = False
    avg_clicks: bool = False
    avg_guesses: bool = False
    # Higher is better:
    avg_completion: bool = True


def pareto_front(
    summary: pd.DataFrame, dims: str, cfg: ParetoConfig = ParetoConfig()
) -> pd.DataFrame:
    """
    Computes Pareto-efficient rows for a given dims using selected metrics.
    Dominance:
      A dominates B if A is >= on all "higher better" metrics and <= on all "lower better" metrics,
      and strictly better in at least one metric.
    """
    df = summary[summary["dims"] == dims].copy()
    if df.empty:
        return df

    metrics = [
        ("success_ratio", cfg.success_ratio),
        ("avg_time_per_click_ms", cfg.avg_time_per_click_ms),
        ("avg_clicks", cfg.avg_clicks),
        ("avg_guesses", cfg.avg_guesses),
        ("avg_completion", cfg.avg_completion),
    ]

    # Clean NaNs (if any) by making them pessimistic:
    for m, higher_better in metrics:
        if m not in df.columns:
            raise ValueError(f"Summary missing metric column '{m}'")
        if higher_better:
            df[m] = df[m].fillna(-np.inf)
        else:
            df[m] = df[m].fillna(np.inf)

    vals = df[[m for m, _ in metrics]].to_numpy()
    higher_flags = np.array([hb for _, hb in metrics], dtype=bool)

    n = len(df)
    is_dominated = np.zeros(n, dtype=bool)

    for i in range(n):
        if is_dominated[i]:
            continue
        for j in range(n):
            if i == j or is_dominated[i]:
                continue

            a = vals[j]
            b = vals[i]

            # Convert to "all higher is better" by flipping lower-better metrics
            a_adj = a.copy()
            b_adj = b.copy()
            a_adj[~higher_flags] = -a_adj[~higher_flags]
            b_adj[~higher_flags] = -b_adj[~higher_flags]

            # j dominates i?
            if np.all(a_adj >= b_adj) and np.any(a_adj > b_adj):
                is_dominated[i] = True

    out = df.loc[~is_dominated].sort_values(
        ["success_ratio", "avg_time_per_click_ms", "avg_clicks", "avg_guesses"],
        ascending=[False, True, True, True],
        kind="stable",
    )
    out = out.assign(pareto=True)
    return out


# -----------------------------
# Orchestration
# -----------------------------


def run_all(
    csv_path: str | Path, out_dir: str | Path | None = None
) -> dict[str, pd.DataFrame]:
    df = load_runs(csv_path)

    tables: dict[str, pd.DataFrame] = {}
    tables["runs_cleaned"] = df
    tables["summary"] = summary_by_combo(df)
    tables["efficiency_on_wins"] = efficiency_on_wins(df)
    tables["loss_quality"] = loss_quality(df)
    tables["seed_stability"] = seed_stability(df)
    tables["objective_sensitivity"] = objective_sensitivity(df)
    tables["board_difficulty"] = board_difficulty(df)

    # Pareto fronts per dims (optional outputs)
    pareto_tables = []
    for dims in sorted(tables["summary"]["dims"].unique()):
        p = pareto_front(tables["summary"], dims=dims)
        if not p.empty:
            pareto_tables.append(p)
    tables["pareto_fronts"] = (
        pd.concat(pareto_tables, ignore_index=True) if pareto_tables else pd.DataFrame()
    )

    if out_dir is not None:
        out_path = Path(out_dir)
        out_path.mkdir(parents=True, exist_ok=True)

        for name, t in tables.items():
            t.to_csv(out_path / f"{name}.csv", index=False)

    return tables


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Minesweeper results analyzer (CSV -> stats tables)"
    )
    ap.add_argument("csv", help="Path to results CSV")
    ap.add_argument("--out", help="Directory to write output CSV tables", default=None)
    args = ap.parse_args()

    tables = run_all(args.csv, out_dir=args.out)

    # Minimal console output: show top-level summary shape and a quick peek
    summary = tables["summary"]
    print(f"\nLoaded runs: {len(tables['runs_cleaned'])}")
    print(f"Summary rows (algorithm, objective, dims): {len(summary)}\n")
    print(summary.head(20).to_string(index=False))

    if args.out:
        print(f"\nWrote tables to: {args.out}")


if __name__ == "__main__":
    main()
