FROM ubuntu:16.04
MAINTAINER OnsightIT <onsightit@gmail.com>

ENV REFRESHED_AT 20160925T0900Z

RUN localedef --force --inputfile=en_US --charmap=UTF-8 \
    --alias-file=/usr/share/locale/locale.alias \
    en_US.UTF-8
ENV LANG en_US.UTF-8

USER root

RUN apt-get --yes update
RUN apt-get --yes upgrade

# Install utils.
RUN apt-get install --yes git sudo openssh-server vim aptitude daemon nodejs inetutils-ping telnet cron

RUN useradd --user-group --create-home --shell /bin/bash healthcoin \
    && echo 'healthcoin:healthcoin' | chpasswd && adduser healthcoin sudo
RUN echo 'healthcoin ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers

COPY web-wallet /home/healthcoin/
RUN chmod a+rwx /home/healthcoin/web-wallet
RUN chown healthcoin:healthcoin /home/healthcoin/web-wallet
RUN mkdir /home/healthcoin/.healthcoin
COPY coin.conf /home/healthcoin/.healthcoin/
RUN chown -R healthcoin:healthcoin /home/healthcoin/.healthcoin

USER healthcoin

# Install web-wallet
RUN cd ~ \
    && git clone https://github.com/onsightit/web-wallet.git

# Expose the nodejs port.
EXPOSE 8181
#EXPOSE 8383

# Add VOLUMEs to allow backup of data
VOLUME  ['/home/healthcoin']

WORKDIR /home/healthcoin

CMD ./web-wallet
