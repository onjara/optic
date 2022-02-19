#
# pre-commit.sh - Run this script prior to commiting any changes to git to ensure
# that all code is properly updated, formatted, linted and tested.
#
echo '*** Removing unnecessary test output and old code coverage ***'
rm -f log*.txt*
rm -f *.log*
rm -f *_log.file_*
rm -rf coverage

echo '*** Adding to git'
git add .

echo '*** Updating dependencies'
udd ./deps.ts
udd ./test_deps.ts
udd ./streams/fileStream/deps.ts

echo '*** Formatting code'
deno fmt

echo '*** Linting code ***'
deno lint

#echo '*** Testing code with coverage'
#deno test -A --coverage=cov_profile
#deno coverage cov_profile --lcov > cov_profile/cov.lcov
#genhtml -o cov_profile/html cov_profile/cov.lcov

deno test -A

echo '*** Check unstable also compiles'
deno cache --unstable mod.ts
deno cache --unstable streams/fileStream/mod.ts

echo '*** Checking git status'
git status

echo '#####'
echo 'To sign a new tag:  git tag -s 1.3.13 -m "your tag message"'
echo 'To push tags:       git push --tags'
echo '#####'