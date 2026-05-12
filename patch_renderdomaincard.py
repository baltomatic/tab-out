import re

with open('extension/app.js', 'r') as f:
    content = f.read()

# Refactor renderDomainCard using document.createElement
# and also update the caller `buildOverflowChips` and wherever `renderDomainCard` is used

# Note: The codebase creates innerHTML blocks for `renderDomainCard`. We will replace it entirely.
