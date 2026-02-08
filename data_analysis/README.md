# Data Analysis and Visualization

This directory contains scripts for analyzing experimental results and generating visualizations.

## Usage

First, navigate to the data analysis directory:
```bash
cd data_analysis/
```

Run the analysis script on the raw results file:
```bash
python analysis.py data_dens18_size2-8.csv --out analyzed_csv
```

This processes the input data and writes aggregated CSV tables to the analyzed_csv/ directory.

Next, generate plots from the analyzed tables:
```bash
python visualization.py --in_dir analyzed_csv/ --out_dir plots
```
