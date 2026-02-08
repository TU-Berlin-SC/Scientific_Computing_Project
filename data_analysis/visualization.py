from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

algo_name_map = {
    "exact_solver": "Human Mimetic",
    "greedy": "Greedy",
    "global_sat": "SAT",
    "partitioned_sat": "Partitioned SAT",
    "scip_solver": "SCIP ILP",
}

dims_edge_map = {
    "2x2x2": 2,
    "3x3x3": 3,
    "4x4x4": 4,
    "5x5x5": 5,
    "6x6x6": 6,
    "7x7x7": 7,
    "8x8x8": 8,
    "10x10x10": 10,
}

algo_color_map = {
    "exact_solver": "#1f77b4",  # blue
    "greedy": "#9467bd",  # purple
    "global_sat": "#ff7f0e",  # orange
    "partitioned_sat": "#d62728",  # red
    "scip_solver": "#2ca02c",  # green
}

objective_marker_map = {
    "MinDistance": "o",
    "MinRotation": "s",
    "MaxInformation": "^",
}

# -----------------------------
# Helpers
# -----------------------------


def _read_csv_safe(path: Path) -> pd.DataFrame | None:
    if not path.exists():
        return None
    return pd.read_csv(path)


def _ensure_dir(d: Path) -> None:
    d.mkdir(parents=True, exist_ok=True)


def _dims_sort_key(d: str) -> tuple:
    # Try to parse like "3x3x3" -> (3,3,3), else lexical
    try:
        parts = tuple(int(x) for x in str(d).lower().split("x"))
        return (0, *parts)
    except Exception:
        return (1, str(d))


def _savefig(out_dir: Path, name: str) -> None:
    plt.tight_layout()
    plt.savefig(out_dir / f"{name}.png", dpi=200)
    plt.close()


def _cat_order(series: pd.Series) -> list[str]:
    # Stable unique order
    return list(pd.unique(series.astype(str)))


def _barplot_grouped(
    df: pd.DataFrame,
    x_col: str,
    y_col: str,
    group_col: str | None,
    title: str,
    xlabel: str,
    ylabel: str,
    out_dir: Path,
    out_name: str,
) -> None:
    """
    Simple grouped bar chart without seaborn.
    - x_col categories on x axis
    - y_col numeric
    - group_col creates multiple bars per x category
    """
    df = df.copy()
    df[x_col] = df[x_col].astype(str)
    if group_col:
        df[group_col] = df[group_col].astype(str)

    x_cats = _cat_order(df[x_col])
    if group_col:
        g_cats = _cat_order(df[group_col])
    else:
        g_cats = [None]

    x = np.arange(len(x_cats))
    width = 0.8 / max(1, len(g_cats))

    plt.figure(figsize=(max(8, len(x_cats) * 0.9), 5))  #
    for gi, g in enumerate(g_cats):
        if g is None:
            sub = df
            label = None
        else:
            sub = df[df[group_col] == g]
            label = g

        # align values to x categories
        y = []
        for xc in x_cats:
            row = sub[sub[x_col] == xc]
            y.append(row[y_col].iloc[0] if len(row) else np.nan)

        plt.bar(x + (gi - (len(g_cats) - 1) / 2) * width, y, width=width, label=label)

    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)

    # Map algorithm names for x-axis if needed
    if x_col == "algorithm":
        x_labels = [algo_name_map.get(a, a) for a in x_cats]
    else:
        x_labels = x_cats

    plt.xticks(x, x_labels, rotation=30, ha="right")

    if group_col:
        plt.legend(fontsize=9, frameon=False)

    _savefig(out_dir, out_name)


# -----------------------------
# Plots
# -----------------------------


def plot_success_by_algo(summary: pd.DataFrame, out_dir: Path) -> None:
    """
    Produces:
      - success_by_algo__<dims>.png for each dims
      - success_by_algo__ALL.png averaged over dims
    """
    df = summary.copy()

    # Ensure success_pct exists
    if "success_pct" not in df.columns:
        df["success_pct"] = pd.to_numeric(df["success_ratio"], errors="coerce") * 100.0
    else:
        df["success_pct"] = pd.to_numeric(df["success_pct"], errors="coerce")

    avg_over_dims = (
        df.groupby(["algorithm", "objective"], dropna=False)
        .agg(success_pct=("success_pct", "mean"))
        .reset_index()
        .sort_values("success_pct", ascending=True, kind="stable")
    )
    _barplot_grouped(
        avg_over_dims,
        x_col="algorithm",
        y_col="success_pct",
        group_col="objective",
        title="Success rate by algorithm",
        xlabel="Algorithm",
        ylabel="Success (%)",
        out_dir=out_dir,
        out_name="success_by_algo__ALL",
    )


def plot_tradeoff_scatter(summary: pd.DataFrame, out_dir: Path) -> None:
    """
    Scatter: success_ratio vs avg_time_per_click_ms.
    Produces:
      - one plot per dims
      - one plot averaged over all dims
    Color = algorithm
    Marker = objective
    """
    df = summary.copy()
    df["success_ratio"] = pd.to_numeric(df["success_ratio"], errors="coerce") * 100.0
    df["avg_time_per_click_ms"] = pd.to_numeric(
        df["avg_time_per_click_ms"], errors="coerce"
    )

    df = df.dropna(subset=["success_ratio", "avg_time_per_click_ms"])

    # Convert to percent ONCE
    df["success_pct"] = df["success_ratio"] * 100.0

    # ---------- helper ----------
    def _plot_one(sub: pd.DataFrame, title: str, out_name: str) -> None:
        plt.figure(figsize=(5, 5))

        for algo in _cat_order(sub["algorithm"]):
            algo_sub = sub[sub["algorithm"].astype(str) == str(algo)]
            color = algo_color_map.get(str(algo), "black")
            algo_label = algo_name_map.get(str(algo), str(algo))

            for obj in _cat_order(algo_sub["objective"]):
                b = algo_sub[algo_sub["objective"].astype(str) == str(obj)]
                if b.empty:
                    continue

                plt.scatter(
                    b["avg_time_per_click_ms"],
                    b["success_ratio"],
                    color=color,
                    marker=objective_marker_map.get(obj, "o"),
                    edgecolors="black",
                    linewidths=0.6,
                    s=70,
                    alpha=0.85,
                    label=f"{algo_label} / {obj}",
                )

        plt.title(title)
        plt.xlabel("Average time per click (ms)")
        plt.ylabel("Success (%)")
        plt.xscale("log")
        plt.grid()
        plt.ylim(0, 100)
        plt.legend(fontsize=7, frameon=False, ncols=2)
        _savefig(out_dir, out_name)

    avg_over_dims = (
        df.groupby(["algorithm", "objective"], dropna=False)
        .agg(
            success_ratio=("success_ratio", "mean"),
            avg_time_per_click_ms=("avg_time_per_click_ms", "mean"),
        )
        .reset_index()
    )

    _plot_one(
        avg_over_dims,
        title="Success rate vs time-per-click",
        out_name="tradeoff_success_vs_timeperclick__ALL",
    )


def plot_loss_quality(
    loss_quality: pd.DataFrame,
    summary: pd.DataFrame,
    out_dir: Path,
) -> None:
    """
    Scatter: avg_completion_on_loss vs avg_clicks_on_loss.
    Produces:
      - one plot per dims
      - one plot averaged over all board sizes (ALL)
    Color = algorithm
    Marker = objective
    """
    # Build full combination grid from summary
    combos = summary[["algorithm", "objective", "dims"]].drop_duplicates()

    df = combos.merge(
        loss_quality,
        on=["algorithm", "objective", "dims"],
        how="left",
    )

    # Numeric columns
    for c in ["avg_completion_on_loss", "avg_clicks_on_loss", "losses"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

    # Offsets so objectives don’t overlap
    obj_list = _cat_order(df["objective"])
    step = 0.04
    center = (len(obj_list) - 1) / 2
    offsets = {obj: (i - center) * step for i, obj in enumerate(obj_list)}

    # ---------- helper for plotting one dataframe ----------
    def _plot_one(sub: pd.DataFrame, title: str, out_name: str) -> None:
        plt.figure(figsize=(6, 6))

        max_x = sub["avg_clicks_on_loss"].max(skipna=True)

        for algo in _cat_order(sub["algorithm"]):
            a = sub[sub["algorithm"].astype(str) == str(algo)]
            color = algo_color_map.get(str(algo), "black")
            algo_label = algo_name_map.get(str(algo), str(algo))

            for obj in _cat_order(a["objective"]):
                b = a[a["objective"].astype(str) == str(obj)]
                if b.empty:
                    continue

                no_loss = b["losses"].isna() | (b["losses"] == 0)

                if bool(no_loss.iloc[0]):
                    # Explicit no-loss marker
                    plt.scatter(
                        [max_x + 0.3],
                        [100.0],
                        color=color,
                        marker="x",
                        s=90,
                        linewidths=2.0,
                        label=f"{algo_label} / {obj} (no losses)",
                    )
                else:
                    plt.scatter(
                        b["avg_clicks_on_loss"] + offsets[obj],
                        b["avg_completion_on_loss"] + offsets[obj],
                        color=color,
                        marker=objective_marker_map.get(obj, "o"),
                        edgecolors="black",
                        linewidths=0.6,
                        s=70,
                        alpha=0.85,
                        label=f"{algo_label} / {obj}",
                    )

        plt.title(title)
        plt.xlabel("Average clicks on loss")
        plt.ylabel("Average completion on loss (%)")
        plt.ylim(0, 100)
        plt.grid()
        plt.legend(fontsize=8, frameon=False, ncols=2)
        _savefig(out_dir, out_name)

    avg_all = (
        df.groupby(["algorithm", "objective"], dropna=False)
        .agg(
            avg_clicks_on_loss=("avg_clicks_on_loss", "mean"),
            avg_completion_on_loss=("avg_completion_on_loss", "mean"),
            losses=("losses", "sum"),  # total losses across all dims
        )
        .reset_index()
    )

    _plot_one(
        avg_all,
        title="Completion vs clicks on loss",
        out_name="loss_quality_completion_vs_clicks__ALL",
    )


def plot_success_vs_board_size(summary: pd.DataFrame, out_dir: Path) -> None:
    """
    One figure: success rate vs board size (numeric edge length) for all algorithms.
    Success is averaged over objectives.
    Adds small deterministic x-offsets so overlapping lines remain visible.
    Color = algorithm
    """
    df = summary.copy()

    # Ensure success_pct exists
    if "success_pct" not in df.columns:
        df["success_pct"] = pd.to_numeric(df["success_ratio"], errors="coerce") * 100.0
    else:
        df["success_pct"] = pd.to_numeric(df["success_pct"], errors="coerce")

    # Map dims -> numeric edge length
    df["edge"] = df["dims"].map(dims_edge_map)
    df = df.dropna(subset=["edge"])

    # Average over objectives
    agg = (
        df.groupby(["algorithm", "edge"], dropna=False)
        .agg(success_pct=("success_pct", "mean"))
        .reset_index()
        .sort_values("edge")
    )

    algo_order = _cat_order(agg["algorithm"])

    # Small x-offsets so lines don’t overlap perfectly
    step = 0.06
    center = (len(algo_order) - 1) / 2
    x_offset = {a: (i - center) * step for i, a in enumerate(algo_order)}

    plt.figure(figsize=(6, 5))

    for i, algo in enumerate(algo_order):
        sub = agg[agg["algorithm"] == algo]
        if sub.empty:
            continue

        x = sub["edge"].astype(float) + x_offset[algo]
        y = sub["success_pct"].astype(float)

        label = algo_name_map.get(str(algo), str(algo))
        color = algo_color_map.get(str(algo), "black")

        plt.plot(
            x,
            y,
            color=color,
            marker="o",
            linestyle="-",
            label=label,
            linewidth=2.0,
            markersize=6,
            markerfacecolor="none",
            markeredgewidth=1.5,
            zorder=10 + i,
        )

    edges = sorted(df["edge"].unique())
    plt.title("Success rate vs board size")
    plt.xlabel("Board edge length")
    plt.ylabel("Success (%)")
    plt.xticks(edges, edges)
    plt.ylim(0, 100)
    plt.legend(fontsize=9, frameon=False)

    _savefig(out_dir, "success_vs_board_size__ALLALGOS")


def plot_guessing_vs_edge(summary: pd.DataFrame, out_dir: Path) -> None:
    """
    Guessing behavior vs board size.
    Adds small x-offsets so overlapping algorithms remain visible.
    """
    df = summary.copy()

    df["avg_guess_rate"] = pd.to_numeric(df["avg_guess_rate"], errors="coerce")
    df["avg_guesses"] = pd.to_numeric(df["avg_guesses"], errors="coerce")

    df["edge"] = df["dims"].map(dims_edge_map)
    df = df.dropna(subset=["edge"])

    agg = (
        df.groupby(["algorithm", "edge"], dropna=False)
        .agg(
            avg_guess_rate=("avg_guess_rate", "mean"),
            avg_guesses=("avg_guesses", "mean"),
        )
        .reset_index()
        .sort_values("edge")
    )

    algo_order = _cat_order(agg["algorithm"])
    edges = sorted(agg["edge"].unique())

    step = 0.08
    center = (len(algo_order) - 1) / 2
    x_offset = {a: (i - center) * step for i, a in enumerate(algo_order)}

    # ---- guesses per game vs edge ----
    plt.figure(figsize=(6, 5))
    for algo in algo_order:
        sub = agg[agg["algorithm"] == algo]
        if sub.empty:
            continue

        x = sub["edge"] + x_offset[algo]
        color = algo_color_map.get(str(algo), "black")
        label = algo_name_map.get(str(algo), str(algo))

        plt.plot(
            x,
            sub["avg_guesses"],
            color=color,
            marker="o",
            linestyle="-",
            linewidth=2.0,
            markersize=6,
            markerfacecolor="none",
            markeredgewidth=1.5,
            label=label,
        )

    plt.title("Guesses per game vs board size")
    plt.xlabel("Board edge length")
    plt.ylabel("Average guesses")
    plt.xticks(edges, edges)
    plt.legend(fontsize=9, frameon=False)
    _savefig(out_dir, "guesses_vs_edge__ALL")


def plot_time_per_click_vs_cell_count(summary: pd.DataFrame, out_dir: Path) -> None:
    """
    avg_time_per_click_ms vs cell count (6 * edge^2).
    Averaged over objectives.
    Adds small x-offsets so overlapping algorithms remain visible.
    """
    df = summary.copy()

    # numeric
    df["avg_time_per_click_ms"] = pd.to_numeric(
        df["avg_time_per_click_ms"], errors="coerce"
    )

    # map edge
    df["edge"] = df["dims"].map(dims_edge_map)
    df = df.dropna(subset=["edge", "avg_time_per_click_ms"])

    # compute cell count
    df["cell_count"] = 6 * (df["edge"] ** 2)

    # average over objectives
    agg = (
        df.groupby(["algorithm", "cell_count"], dropna=False)
        .agg(avg_time_per_click_ms=("avg_time_per_click_ms", "mean"))
        .reset_index()
        .sort_values("cell_count")
    )

    algo_order = _cat_order(agg["algorithm"])
    cell_counts = sorted(agg["cell_count"].unique())

    # small deterministic x-offsets (relative to scale)
    step_frac = 0.015  # 1.5% of x-value
    center = (len(algo_order) - 1) / 2
    x_offset = {a: (i - center) * step_frac for i, a in enumerate(algo_order)}

    plt.figure(figsize=(8, 5))

    for algo in algo_order:
        sub = agg[agg["algorithm"] == algo]
        if sub.empty:
            continue

        # multiplicative offset (works better on log axis)
        x = sub["cell_count"] * (1.0 + x_offset[algo])
        y = sub["avg_time_per_click_ms"]

        color = algo_color_map.get(str(algo), "black")
        label = algo_name_map.get(str(algo), str(algo))

        plt.plot(
            x,
            y,
            color=color,
            marker="o",
            linestyle="-",
            linewidth=2.0,
            markersize=6,
            markerfacecolor="none",
            markeredgewidth=1.5,
            label=label,
        )

    plt.title("Average time per click vs cell count")
    plt.xlabel("Cell count")
    plt.ylabel("Average time per click (ms)")
    # plt.xscale("log")
    # plt.yscale("log")
    plt.legend(fontsize=9, frameon=False)

    _savefig(out_dir, "time_per_click_vs_cell_count__ALL")


# -----------------------------
# Main
# -----------------------------


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Create visualizations from analyzer output CSVs"
    )
    ap.add_argument(
        "--in_dir",
        default="out_tables",
        help="Directory containing summary.csv, loss_quality.csv, board_difficulty.csv, etc.",
    )
    ap.add_argument(
        "--out_dir",
        default="viz",
        help="Directory to write PNG figures",
    )
    args = ap.parse_args()

    in_dir = Path(args.in_dir)
    out_dir = Path(args.out_dir)
    _ensure_dir(out_dir)

    summary = _read_csv_safe(in_dir / "summary.csv")
    lossq = _read_csv_safe(in_dir / "loss_quality.csv")
    board = _read_csv_safe(in_dir / "board_difficulty.csv")

    if summary is None:
        raise SystemExit(
            f"Missing {in_dir/'summary.csv'}. Run the analyzer script with --out first."
        )
    if lossq is None:
        print(
            f"Note: {in_dir/'loss_quality.csv'} not found, skipping loss-quality plot."
        )
    if board is None:
        print(
            f"Note: {in_dir/'board_difficulty.csv'} not found, skipping board-difficulty plot."
        )

    # Core plots
    plot_success_by_algo(summary, out_dir)
    plot_tradeoff_scatter(summary, out_dir)

    if lossq is not None:
        plot_loss_quality(lossq, summary, out_dir)
    plot_success_vs_board_size(summary, out_dir)
    plot_guessing_vs_edge(summary, out_dir)
    plot_time_per_click_vs_cell_count(summary, out_dir)
    print(f"Wrote figures to: {out_dir.resolve()}")


if __name__ == "__main__":
    main()
