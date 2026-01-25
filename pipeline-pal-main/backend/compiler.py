"""
Assembly Compiler Module
Converts RISC-V assembly (.S) files to binary (.bin) using Makefile
"""

import subprocess
import os
import tempfile
import shutil
from pathlib import Path


class AssemblyCompiler:
    """Compiles RISC-V assembly files to binary"""
    
    def __init__(self, assembly_dir="assembly_program"):
        """
        Initialize compiler with assembly program directory
        
        Args:
            assembly_dir: Directory containing Makefile
        """
        self.assembly_dir = Path(__file__).parent / assembly_dir
        if not self.assembly_dir.exists():
            raise FileNotFoundError(f"Assembly directory not found: {self.assembly_dir}")
        
        if not (self.assembly_dir / "Makefile").exists():
            raise FileNotFoundError(f"Makefile not found in {self.assembly_dir}")
    
    def compile_assembly(self, assembly_code: str, filename: str = "temp_program.S") -> bytes:
        """
        Compile assembly code to binary
        
        Args:
            assembly_code: Assembly source code as string
            filename: Name for temporary .S file
        
        Returns:
            Binary machine code as bytes
        
        Raises:
            Exception: If compilation fails
        """
        # Ensure filename ends with .S
        if not filename.endswith('.S'):
            filename = filename.replace('.S', '') + '.S'
        
        temp_dir = self.assembly_dir / "temp_compile"
        temp_dir.mkdir(exist_ok=True)
        
        try:
            asm_file = temp_dir / filename
            bin_file = temp_dir / filename.replace('.S', '.bin')
            obj_file = temp_dir / filename.replace('.S', '.o')
            
            # Write assembly to temp file
            asm_file.write_text(assembly_code)
            
            # Compile using Makefile
            compile_result = self._run_make_compile(asm_file, obj_file, bin_file)
            
            if not bin_file.exists():
                raise Exception(f"Compilation failed: {compile_result}")
            
            # Read binary
            binary_data = bin_file.read_bytes()
            
            return binary_data
            
        except Exception as e:
            raise Exception(f"Assembly compilation error: {str(e)}")
        finally:
            # Cleanup
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
    
    def _run_make_compile(self, asm_file: Path, obj_file: Path, bin_file: Path) -> str:
        """
        Run manual compilation commands instead of make
        (More reliable on all platforms)
        
        Args:
            asm_file: Path to .S file
            obj_file: Path to .o file
            bin_file: Path to .bin file
        
        Returns:
            Command output
        """
        try:
            # Step 1: Assemble .S to .o
            assemble_cmd = [
                'riscv64-unknown-elf-as',
                str(asm_file),
                '-o',
                str(obj_file)
            ]
            
            result = subprocess.run(
                assemble_cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                raise Exception(f"Assembly failed: {result.stderr}")
            
            # Step 2: Convert .o to binary
            objcopy_cmd = [
                'riscv64-unknown-elf-objcopy',
                '-O', 'binary',
                str(obj_file),
                str(bin_file)
            ]
            
            result = subprocess.run(
                objcopy_cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                raise Exception(f"Objcopy failed: {result.stderr}")
            
            return result.stdout
            
        except FileNotFoundError:
            raise Exception(
                "RISC-V toolchain not found!\n\n"
                "The RISC-V assembler (riscv64-unknown-elf-as) is not installed.\n\n"
                "SOLUTION: Use the local JavaScript assembler instead (no installation needed).\n"
                "The local assembler supports all common RISC-V instructions and works on Windows.\n\n"
                "If you want to install RISC-V tools:\n"
                "- On Linux: sudo apt-get install binutils-riscv64-unknown-elf\n"
                "- On macOS: brew install riscv-tools\n"
                "- On Windows: Use WSL2 or the cross-compiler prebuilt binaries\n"
            )
        except subprocess.TimeoutExpired:
            raise Exception("Compilation timeout")
    
    def binary_to_instructions(self, binary_data: bytes) -> list:
        """
        Convert binary data to list of 32-bit instruction integers
        
        Args:
            binary_data: Compiled binary machine code
        
        Returns:
            List of 32-bit integers (little-endian)
        """
        instructions = []
        
        # Read 4 bytes at a time (32-bit RISC-V instructions)
        for i in range(0, len(binary_data), 4):
            if i + 4 <= len(binary_data):
                word = binary_data[i:i+4]
                # Convert from little-endian bytes to 32-bit integer
                instr = int.from_bytes(word, byteorder='little')
                instructions.append(instr)
        
        return instructions
    
    def compile_to_instructions(self, assembly_code: str) -> list:
        """
        Compile assembly code directly to instruction list
        
        Args:
            assembly_code: Assembly source code
        
        Returns:
            List of 32-bit instruction integers
        """
        binary = self.compile_assembly(assembly_code)
        return self.binary_to_instructions(binary)


# Global compiler instance
_compiler = None


def get_compiler() -> AssemblyCompiler:
    """Get or create global compiler instance"""
    global _compiler
    if _compiler is None:
        _compiler = AssemblyCompiler()
    return _compiler
