"""Run this once after stopping the server to fix the corrupted microarch_spec.py"""
import os

spec = {
    'name': 'inorder_5stage',
    'description': 'Classic 5-stage in-order RISC pipeline',
    'pipeline_stages': ['IF', 'ID', 'EX', 'MEM', 'WB'],
    'issue_width': 1,
    'forwarding': True,
    'branch_penalty': 3,
    'memory_latency': 2,
    'functional_units': {
        'ALU':    {'latency': 1, 'instances': 1},
        'MEM':    {'latency': 2, 'instances': 1},
        'BRANCH': {'latency': 1, 'instances': 1},
        'JUMP':   {'latency': 1, 'instances': 1},
    },
    'pipeline_capacity': 5,
    'pipelined_execution': True,
    'control': {'branch_resolution_stage': 'EX', 'branch_prediction': False},
    'debug': {'trace_pipeline': False, 'trace_stalls': False},
}

path = os.path.join(os.path.dirname(__file__), 'microarch', 'inorder_5stage', 'microarch_spec.py')
content = f'"""\nMicroarchitecture Specification - auto-generated\n"""\n\nMICROARCH = {repr(spec)}\n'

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
data = open(path, 'rb').read()
data.decode('utf-8')
bad = [b for b in data if b > 127]
if bad:
    print(f"ERROR: still has bad bytes: {bad}")
else:
    print("SUCCESS: microarch_spec.py is now valid UTF-8")
    print(f"File size: {len(data)} bytes")
