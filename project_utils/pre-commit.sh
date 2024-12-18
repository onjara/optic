#
# pre-commit.sh - Run this script prior to commiting any changes to git to ensure
# that all code is properly updated, formatted, linted and tested.
#
echo '*** Removing unnecessary test output and old code coverage ***'
rm -f log*.txt*
rm -f *.log*
rm -f *_log.file_*
rm -rf coverage

echo ''
echo '*** Adding to git'
git add .

echo ''
echo '*** Formatting code'
deno fmt

echo ''
echo '*** Linting code ***'
deno lint

#echo '*** Testing code with coverage'
#deno test -A --coverage=cov_profile
#deno coverage cov_profile --lcov > cov_profile/cov.lcov
#genhtml -o cov_profile/html cov_profile/cov.lcov
echo ''
echo '*** Testing code'
deno test -A

echo ''
echo '*** Check license and copyright headers'
deno run --allow-read=. https://deno.land/x/copyright_license_checker@1.1.1/checker.ts project_utils/header_config.json

if [ $? -eq 0 ]; then
  echo ''
else
  echo '---License and copyright headers are NOT OK---'
  echo 'Run: deno run --allow-read=. --allow-write=. https://deno.land/x/copyright_license_checker@1.1.1/updater.ts project_utils/header_config.json'
  echo ''
fi

echo '*** Check unstable also compiles'
deno cache --reload --unstable mod.ts
deno cache --reload --unstable streams/fileStream/fileStream.ts

echo ''
echo '*** Checking git status'
git status

echo ''
echo '#####'
echo "Latest tag is: $(git describe --abbrev=0)"
echo 'To sign a new tag:  git tag -s 1.3.13 -m "your tag message"'
echo 'To push tags:       git push --tags'
echo '#####'