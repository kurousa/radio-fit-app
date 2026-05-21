import os
import json
import sys

# Mocking reading PR comments for now since gh is not installed and read_pr_comments is requested
try:
    with open('/home/runner/work/_temp/pr_comments.json', 'r') as f:
        print(f.read())
except Exception:
    pass
