"""
Microarchitecture Specification - auto-generated
"""

MICROARCH = {'name': 'inorder_5stage', 'description': 'Classic 5-stage in-order RISC pipeline', 'pipeline_stages': ['IF', 'ID', 'EX', 'MEM', 'WB'], 'issue_width': 1, 'forwarding': True, 'branch_penalty': 3, 'memory_latency': 2, 'functional_units': {'ALU': {'latency': 1, 'instances': 1}, 'MEM': {'latency': 2, 'instances': 1}, 'BRANCH': {'latency': 1, 'instances': 1}, 'JUMP': {'latency': 1, 'instances': 1}}, 'pipeline_capacity': 5, 'pipelined_execution': True, 'control': {'branch_resolution_stage': 'EX', 'branch_prediction': False}, 'debug': {'trace_pipeline': False, 'trace_stalls': False}}
