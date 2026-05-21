import os

main_path = "main.py"
deps_path = "core/dependencies.py"
new_main_path = "main_new.py"

with open(main_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

deps_lines = lines[:496]
main_lines = lines[496:]

# Write dependencies
with open(deps_path, "w", encoding="utf-8") as f:
    f.writelines(deps_lines)

# Write new main
with open(new_main_path, "w", encoding="utf-8") as f:
    f.write("from core.dependencies import *\n")
    f.writelines(main_lines)

print("Split completed successfully!")
