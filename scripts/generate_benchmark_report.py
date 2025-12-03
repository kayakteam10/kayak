#!/usr/bin/env python3
"""
Kayak Performance Benchmark Report Generator
Parses JMeter JTL files and generates bar graphs
"""

import csv
import sys
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend

def parse_jtl(file_path):
    """Parse JMeter JTL file and extract metrics"""
    metrics = {
        'samples': 0,
        'errors': 0,
        'latencies': [],
        'elapsed_times': [],
        'timestamps': []
    }
    
    with open(file_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            metrics['samples'] += 1
            if row['success'] == 'false':
                metrics['errors'] += 1
            metrics['latencies'].append(int(row['Latency']))
            metrics['elapsed_times'].append(int(row['elapsed']))
            metrics['timestamps'].append(int(row['timeStamp']))
    
    # Calculate stats
    avg_latency = sum(metrics['latencies']) / len(metrics['latencies']) if metrics['latencies'] else 0
    p95_latency = sorted(metrics['latencies'])[int(len(metrics['latencies']) * 0.95)] if metrics['latencies'] else 0
    
    # Fixed throughput calculation: samples / test_duration_in_seconds
    test_duration_ms = max(metrics['timestamps']) - min(metrics['timestamps'])
    test_duration_sec = test_duration_ms / 1000.0
    throughput = metrics['samples'] / test_duration_sec if test_duration_sec > 0 else 0
    
    error_rate = (metrics['errors'] / metrics['samples'] * 100) if metrics['samples'] > 0 else 0
    
    return {
        'throughput': throughput,
        'avg_latency': avg_latency,
        'p95_latency': p95_latency,
        'error_rate': error_rate,
        'total_samples': metrics['samples']
    }

def generate_bar_graphs(data, output_dir):
    """Generate bar graphs comparing scenarios"""
    scenarios = list(data.keys())
    scenario_labels = [
        'A\n(Base)',
        'B\n(+Cache)',
        'C\n(+Kafka)',
        'D\n(+Compression)'
    ]
    
    # Throughput graph
    plt.figure(figsize=(10, 6))
    throughputs = [data[s]['throughput'] for s in scenarios]
    plt.bar(scenarios, throughputs, color=['#e74c3c', '#3498db', '#2ecc71', '#f39c12'])
    plt.xlabel('Scenario', fontsize=12)
    plt.ylabel('Throughput (req/sec)', fontsize=12)
    plt.title('Throughput Comparison Across Scenarios', fontsize=14, fontweight='bold')
    plt.xticks(range(len(scenarios)), scenario_labels)
    plt.grid(axis='y', alpha=0.3)
    for i, v in enumerate(throughputs):
        plt.text(i, v + max(throughputs) * 0.02, f'{v:.1f}', ha='center', fontweight='bold')
    plt.tight_layout()
    plt.savefig(f'{output_dir}/throughput_comparison.png', dpi=150)
    plt.close()
    
    # Latency graph
    plt.figure(figsize=(10, 6))
    avg_latencies = [data[s]['avg_latency'] for s in scenarios]
    p95_latencies = [data[s]['p95_latency'] for s in scenarios]
    
    x = range(len(scenarios))
    width = 0.35
    plt.bar([i - width/2 for i in x], avg_latencies, width, label='Average', color='#3498db')
    plt.bar([i + width/2 for i in x], p95_latencies, width, label='95th Percentile', color='#e74c3c')
    
    plt.xlabel('Scenario', fontsize=12)
    plt.ylabel('Latency (ms)', fontsize=12)
    plt.title('Latency Comparison Across Scenarios', fontsize=14, fontweight='bold')
    plt.xticks(x, scenario_labels)
    plt.legend()
    plt.grid(axis='y', alpha=0.3)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/latency_comparison.png', dpi=150)
    plt.close()
    
    # Error rate graph
    plt.figure(figsize=(10, 6))
    error_rates = [data[s]['error_rate'] for s in scenarios]
    colors = ['#2ecc71' if er < 1 else '#f39c12' if er < 5 else '#e74c3c' for er in error_rates]
    plt.bar(scenarios, error_rates, color=colors)
    plt.xlabel('Scenario', fontsize=12)
    plt.ylabel('Error Rate (%)', fontsize=12)
    plt.title('Error Rate Comparison Across Scenarios', fontsize=14, fontweight='bold')
    plt.xticks(range(len(scenarios)), scenario_labels)
    plt.grid(axis='y', alpha=0.3)
    for i, v in enumerate(error_rates):
        plt.text(i, v + max(error_rates + [0.1]) * 0.02, f'{v:.2f}%', ha='center', fontweight='bold')
    plt.tight_layout()
    plt.savefig(f'{output_dir}/error_rate_comparison.png', dpi=150)
    plt.close()
    
    # NEW: Line graph showing performance progression
    plt.figure(figsize=(12, 7))
    
    # Plot throughput on primary y-axis
    ax1 = plt.gca()
    throughputs = [data[s]['throughput'] for s in scenarios]
    line1 = ax1.plot(scenarios, throughputs, marker='o', linewidth=2.5, markersize=8, 
                     color='#2ecc71', label='Throughput (req/s)')
    ax1.set_xlabel('Optimization Scenario', fontsize=12)
    ax1.set_ylabel('Throughput (req/s)', fontsize=12, color='#2ecc71')
    ax1.tick_params(axis='y', labelcolor='#2ecc71')
    ax1.set_xticks(range(len(scenarios)))
    ax1.set_xticklabels(scenario_labels)
    ax1.grid(True, alpha=0.3)
    
    # Plot latency on secondary y-axis
    ax2 = ax1.twinx()
    avg_latencies = [data[s]['avg_latency'] for s in scenarios]
    line2 = ax2.plot(scenarios, avg_latencies, marker='s', linewidth=2.5, markersize=8,
                     color='#e74c3c', label='Avg Latency (ms)')
    ax2.set_ylabel('Average Latency (ms)', fontsize=12, color='#e74c3c')
    ax2.tick_params(axis='y', labelcolor='#e74c3c')
    
    # Add values on data points
    for i, v in enumerate(throughputs):
        ax1.text(i, v, f'{v:.0f}', ha='center', va='bottom', fontweight='bold', color='#2ecc71')
    for i, v in enumerate(avg_latencies):
        ax2.text(i, v, f'{v:.0f}', ha='center', va='top', fontweight='bold', color='#e74c3c')
    
    # Combined legend
    lines = line1 + line2
    labels = [l.get_label() for l in lines]
    ax1.legend(lines, labels, loc='upper left', fontsize=10)
    
    plt.title('Performance Progression Across Optimization Scenarios', fontsize=14, fontweight='bold', pad=20)
    plt.tight_layout()
    plt.savefig(f'{output_dir}/performance_progression.png', dpi=150, bbox_inches='tight')
    plt.close()

def generate_markdown_report(data, output_file):
    """Generate markdown report with embedded graphs"""
    with open(output_file, 'w') as f:
        f.write("# Kayak Performance Benchmark Report\n\n")
        f.write("## Test Configuration\n\n")
        f.write("- **Concurrent Users**: 400\n")
        f.write("- **Ramp-up Time**: 10 seconds\n")
        f.write("- **Test Duration**: 60 seconds\n")
        f.write("- **Endpoints**: Flight Search, Hotel Search, Car Search\n\n")
        
        f.write("## Scenarios Tested\n\n")
        f.write("| Scenario | Cache | Kafka | Compression |\n")
        f.write("|----------|--------|--------|-------------|\n")
        f.write("| A (Base) | ❌ | ❌ | ❌ |\n")
        f.write("| B (+ Cache) | ✅ | ❌ | ❌ |\n")
        f.write("| C (+ Kafka) | ✅ | ✅ | ❌ |\n")
        f.write("| D (Full) | ✅ | ✅ | ✅ |\n\n")
        
        f.write("## Performance Metrics\n\n")
        f.write("| Scenario | Throughput (req/s) | Avg Latency (ms) | P95 Latency (ms) | Error Rate (%) | Total Samples |\n")
        f.write("|----------|-------------------|-------------------|-------------------|----------------|---------------|\n")
        
        for scenario in ['A', 'B', 'C', 'D']:
            if scenario in data:
                d = data[scenario]
                f.write(f"| {scenario} | {d['throughput']:.2f} | {d['avg_latency']:.2f} | {d['p95_latency']:.0f} | {d['error_rate']:.2f} | {d['total_samples']:,} |\n")
        
        f.write("\n## Visual Comparisons\n\n")
        
        f.write("### Performance Progression\n\n")
        f.write("![Performance Progression](results/performance_progression.png)\n\n")
        
        f.write("### Throughput Comparison\n\n")
        f.write("![Throughput Comparison](results/throughput_comparison.png)\n\n")
        
        f.write("### Latency Comparison\n\n")
        f.write("![Latency Comparison](results/latency_comparison.png)\n\n")
        
        f.write("### Error Rate Comparison\n\n")
        f.write("![Error Rate Comparison](results/error_rate_comparison.png)\n\n")
        
        f.write("## Analysis\n\n")
        
        # Calculate improvements
        if 'A' in data and 'D' in data:
            throughput_improvement = ((data['D']['throughput'] - data['A']['throughput']) / data['A']['throughput']) * 100
            latency_improvement = ((data['A']['avg_latency'] - data['D']['avg_latency']) / data['A']['avg_latency']) * 100
            
            f.write(f"### Overall Impact of Optimizations\n\n")
            f.write(f"- **Throughput Improvement**: {throughput_improvement:+.1f}%\n")
            f.write(f"- **Latency Reduction**: {latency_improvement:+.1f}%\n\n")
            
            if 'B' in data:
                cache_impact = ((data['B']['throughput'] - data['A']['throughput']) / data['A']['throughput']) * 100
                f.write(f"### Individual Feature Impact\n\n")
                f.write(f"- **Redis Caching**: {cache_impact:+.1f}% throughput improvement\n")
            
            if 'C' in data and 'B' in data:
                kafka_impact = ((data['C']['throughput'] - data['B']['throughput']) / data['B']['throughput']) * 100
                f.write(f"- **Kafka Async Processing**: {kafka_impact:+.1f}% throughput improvement\n")
            
            if 'D' in data and 'C' in data:
                compression_impact = ((data['D']['throughput'] - data['C']['throughput']) / data['C']['throughput']) * 100
                f.write(f"- **Gzip Compression**: {compression_impact:+.1f}% throughput improvement\n")

def main():
    results_dir = Path('results')
    if not results_dir.exists():
        print("Error: results directory not found")
        sys.exit(1)
    
    # Parse all scenario results
    data = {}
    for scenario in ['A', 'B', 'C', 'D']:
        jtl_file = results_dir / f'scenario_{scenario}.jtl'
        if jtl_file.exists():
            print(f"Parsing scenario_{scenario}.jtl...")
            data[scenario] = parse_jtl(jtl_file)
        else:
            print(f"Warning: {jtl_file} not found, skipping scenario {scenario}")
    
    if not data:
        print("Error: No JTL files found")
        sys.exit(1)
    
    # Generate bar graphs
    print("Generating bar graphs...")
    generate_bar_graphs(data, results_dir)
    
    # Generate markdown report
    print("Generating markdown report...")
    generate_markdown_report(data, 'performance_report.md')
    
    print("\n✓ Report generated: performance_report.md")
    print("✓ Graphs saved to: results/")

if __name__ == '__main__':
    main()
