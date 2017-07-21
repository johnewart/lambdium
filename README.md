# lambdium package

Lambdium is a plugin for Atom to make working with Lambda easier and more convenient.
Currently it works by having you create a `.lambdium` file in the root of any
of your Lambda function code and then allows you to upload your code to Lambda
directly from inside of Atom and invoke your method(s) using data files.

### Example config file

```yaml
name: myapp
profile: awsprofile
region: us-east-1
functions:
  - name: thumbnailExtractor
    files:
      - lib/
      - shoebox/__init__.py
      - shoebox/lambda.py
      - shoebox/processor.py
    ignore:
      - pyc
      - so
      - c
    tests:
      - name: S3 Test
        file: test/s3test.json

```

This is in the very early stages of development so things may change rapidly.

Feedback (issues, pull requests, feature requests) is more than welcome!

## Credits

This package is based on the `gulp-manager` plugin written by [Benjamin Romano](https://github.com/benjaminRomano) and leverages the very handy
`bottom-dock` Atom package (by the same author)

(c) 2017 John Ewart
