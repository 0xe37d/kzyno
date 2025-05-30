#!/bin/bash

suits=(clubs diamonds spades hearts)
ranks=(2 3 4 5 6 7 8 9 10 A J Q K)

# Build current incorrect order
wrong_order=()
for suit in "${suits[@]}"; do
  for rank in "${ranks[@]}"; do
    wrong_order+=("${suit}_${rank}.png")
  done
done

# Build correct order
right_order=()
for rank in "${ranks[@]}"; do
  for suit in "${suits[@]}"; do
    right_order+=("${suit}_${rank}.png")
  done
done

# Rename using temporary names to avoid collisions
for i in "${!wrong_order[@]}"; do
  mv "${wrong_order[$i]}" "temp_$i.png"
done

# Rename temp files to correct names
for i in "${!right_order[@]}"; do
  mv "temp_$i.png" "${right_order[$i]}"
done

echo "✅ All card names remapped correctly."
