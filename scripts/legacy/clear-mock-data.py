#!/usr/bin/env python3
import re

with open('src/app/core/state/academy.store.ts', 'r') as f:
    content = f.read()

# Replace parentsState signal initialization with empty signal
# Match: private readonly parentsState = signal<readonly Parent[]>( followed by anything until ]);
parents_match = r'private readonly parentsState = signal<readonly Parent\[\]\([^)]*\)'
parents_replacement = 'private readonly parentsState = signal<readonly Parent[]>([]);'

content = re.sub(
    r'private readonly parentsState = signal<readonly Parent\[\]>\([^)]*\)',
    parents_replacement,
    content
)

# Replace studentsState signal initialization with empty signal
students_match = r'private readonly studentsState = signal<readonly Student\[\]\([^)]*\)'
students_replacement = 'private readonly studentsState = signal<readonly Student[]>([]);'

content = re.sub(
    r'private readonly studentsState = signal<readonly Student\[\]>\([^)]*\)',
    students_replacement,
    content
)

with open('src/app/core/state/academy.store.ts', 'w') as f:
    f.write(content)

print('Mock data signals cleared successfully')