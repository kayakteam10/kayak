import json
import matplotlib.pyplot as plt
import glob
import os
import numpy as np
import csv

def load_results():
    results = []
    
    # Load JSON results (Node.js script)
    json_files = glob.glob('results/benchmark_*.json')
    for f in json_files:
        with open(f, 'r') as file:
            try:
                data = json.load(file)
                results.append(data)
            except json.JSONDecodeError:
                print(f"⚠️  Skipping invalid JSON: {f}")

    # Load CSV results (JMeter)
    csv_files = glob.glob('results/benchmark_*.csv')
    for f in csv_files:
        config_name = os.path.basename(f).replace('benchmark_', '').replace('.csv', '')
        metrics = parse_jmeter_csv(f)
        if metrics:
            results.append({
                'config': config_name,
                'metrics': metrics
            })

    return results

def parse_jmeter_csv(file_path):
    latencies = []
    success_count = 0
    total_count = 0
    start_time = float('inf')
    end_time = 0

    try:
        with open(file_path, 'r') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                total_count += 1
                if row['success'] == 'true':
                    success_count += 1
                    latency = int(row['Latency'])
                    latencies.append(latency)
                    
                    timestamp = int(row['timeStamp'])
                    start_time = min(start_time, timestamp)
                    end_time = max(end_time, timestamp)
    except Exception as e:
        print(f"❌ Error parsing CSV {file_path}: {e}")
        return None

    if total_count == 0:
        return None

    duration_seconds = (end_time - start_time) / 1000 if end_time > start_time else 1
    throughput = success_count / duration_seconds if duration_seconds > 0 else 0
    
    latencies.sort()
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    p99_latency = latencies[int(len(latencies) * 0.99)] if latencies else 0

    return {
        'throughputRPS': f"{throughput:.2f}",
        'avgLatencyMs': f"{avg_latency:.2f}",
        'p99LatencyMs': p99_latency,
        'totalRequests': total_count,
        'successRequests': success_count,
        'failedRequests': total_count - success_count
    }

def plot_metrics(results):
    if not results:
        print("❌ No valid results to plot.")
        return

    # Sort results by config name for consistent order
    order = ['base', 'cache', 'kafka', 'optimized']
    results.sort(key=lambda x: order.index(x['config']) if x['config'] in order else 999)

    configs = [r['config'].upper() for r in results]
    throughput = [float(r['metrics']['throughputRPS']) for r in results]
    avg_latency = [float(r['metrics']['avgLatencyMs']) for r in results]
    p99_latency = [float(r['metrics']['p99LatencyMs']) for r in results]

    x = np.arange(len(configs))
    width = 0.25

    fig, ax1 = plt.subplots(figsize=(12, 6))

    # Plot Throughput (Bar)
    bars1 = ax1.bar(x - width, throughput, width, label='Throughput (RPS)', color='#2ecc71')
    ax1.set_ylabel('Requests Per Second', color='#2ecc71', fontweight='bold')
    ax1.tick_params(axis='y', labelcolor='#2ecc71')
    ax1.set_title('Performance Benchmark Comparison', fontsize=16, fontweight='bold')
    ax1.set_xticks(x)
    ax1.set_xticklabels(configs, fontweight='bold')
    ax1.grid(axis='y', linestyle='--', alpha=0.3)

    # Plot Latency (Bar) on secondary axis
    ax2 = ax1.twinx()
    bars2 = ax2.bar(x, avg_latency, width, label='Avg Latency (ms)', color='#e74c3c')
    bars3 = ax2.bar(x + width, p99_latency, width, label='P99 Latency (ms)', color='#c0392b', alpha=0.7)
    ax2.set_ylabel('Latency (ms)', color='#e74c3c', fontweight='bold')
    ax2.tick_params(axis='y', labelcolor='#e74c3c')

    # Add legend
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left')

    # Add value labels
    def add_labels(bars, ax):
        for bar in bars:
            height = bar.get_height()
            ax.annotate(f'{height:.1f}',
                        xy=(bar.get_x() + bar.get_width() / 2, height),
                        xytext=(0, 3),
                        textcoords="offset points",
                        ha='center', va='bottom', fontweight='bold')

    add_labels(bars1, ax1)
    add_labels(bars2, ax2)
    add_labels(bars3, ax2)

    plt.tight_layout()
    plt.savefig('results/performance_comparison.png')
    print("✅ Chart saved to results/performance_comparison.png")

if __name__ == "__main__":
    try:
        results = load_results()
        plot_metrics(results)
    except Exception as e:
        print(f"❌ Error generating chart: {e}")
