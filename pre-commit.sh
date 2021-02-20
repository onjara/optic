#
# pre-commit.sh - Run this script prior to commiting any changes to git to ensure
# that all code is properly updated, formatted, linted and tested.
#
echo '*** Removing erroneous test output ***'
rm -f log*.txt*
rm -f *.log*

echo '*** Adding to git'
git add .

echo '*** Updating dependencies'
udd ./deps.ts
udd ./test_deps.ts
udd ./streams/fileStream/deps.ts

echo '*** Formatting code'
deno fmt

echo '*** Linting code ***'
deno lint --unstable

echo '*** Testing code'
deno test -A

echo '*** Checking git status'
git status