from cpu.cpu import CPU
import json

cpu = CPU()
instructions = [
    0x00A00093,  # addi x1, x0, 10
    0x00500113,  # addi x2, x0, 5
    0x002081B3,  # add x3, x1, x2
    0x40118233,  # sub x4, x3, x1
    0x002192B3,  # and x5, x3, x2
    0x00526333,  # or x6, x4, x5
    0x002143B3,  # xor x7, x1, x2
    0x00209433,  # sll x8, x1, x2
    0x0020A4B3,  # slt x9, x2, x1
    0x00000013,  # nop
]

cpu.load_program(instructions)

# Step to cycle 10
for i in range(10):
    cpu.step()

# Print ALU state
print("=== ALU State at Cycle 10 ===")
print(json.dumps(cpu.get_state()['alu'], indent=2))

print("\n=== ID_EX Register ===")
id_ex = cpu.get_state()['pipeline']['ID_EX']
print(f"Assembly: {id_ex.get('assembly')}")
print(f"ALU OP: {id_ex.get('control_signals', {}).get('aluOp')}")
print(f"rs1: x{id_ex.get('rs1')} = {id_ex.get('rs1_value')}")
print(f"rs2: x{id_ex.get('rs2')} = {id_ex.get('rs2_value')}")

print("\n=== Register Values ===")
regs = cpu.get_state()['registers']['values']
print(f"x1 = {regs[1]}")
print(f"x2 = {regs[2]}")
print(f"x3 = {regs[3]}")

print("\n=== ANALYSIS ===")
print(f"ID_EX contains instruction that WILL execute in NEXT cycle")
print(f"ALU state shows what WAS JUST executed in THIS cycle")
print(f"At cycle 10: ALU executed 'sll x8, x1, x2', next will be 'slt x9, x1, x2'")
