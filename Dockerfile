FROM ruby:2.6

COPY . /usr/local/src
WORKDIR /usr/local/src

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential

# 2.6-slim-stretch comes with bundler 1.17 installed, but we need >2.0.
RUN gem uninstall -x bundler && gem install bundler -v 2.0.1
RUN bundle install
