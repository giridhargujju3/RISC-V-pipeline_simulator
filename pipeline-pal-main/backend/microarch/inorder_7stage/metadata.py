METADATA = {
    "name": "7-Stage In-Order Pipeline",
    "description": "7-stage in-order pipeline with split IF and EX stages",
    "stages": ["IF1", "IF2", "ID", "EX1", "EX2", "MEM", "WB"],
    "supported_isa": ["rv32i", "rv64i", "rv64im"],
    "hazard_detection": False,
    "forwarding": False,
    "status": "stub_implementation"
}
