import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { newChannel, capFor, checkCap, viewCapFor, talkCapFor } from '@/lib/capability';

const EXPIRATION_TIME_IN_SECONDS = 3600;

export async function GET(request: NextRequest) {
  // console.log('Generating Agora token...');
  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const APP_CERTIFICATE = process.env.NEXT_AGORA_APP_CERTIFICATE;

  if (!APP_ID || !APP_CERTIFICATE) {
    return NextResponse.json(
      { error: 'Agora credentials are not set' },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const uidStr = searchParams.get('uid');
  const parsedUid = uidStr ? parseInt(uidStr, 10) : Number.NaN;
  const uid = Number.isNaN(parsedUid) || parsedUid <= 0
    ? Math.floor(Math.random() * 9_999_000) + 1000
    : parsedUid;
  // A new call gets a server-made channel; renewing a token for an existing one needs its capability.
  const asked = searchParams.get('channel');
  if (asked && !checkCap(asked, searchParams.get('cap'))) {
    return NextResponse.json({ error: 'not your call' }, { status: 403 });
  }
  const channelName = asked || newChannel();
  const cap = capFor(channelName);
  if (!cap) return NextResponse.json({ error: 'server secret not set' }, { status: 500 });

  const expirationTime =
    Math.floor(Date.now() / 1000) + EXPIRATION_TIME_IN_SECONDS;

  try {
    // console.log('Building RTC+RTM token: uid =', uid, 'channel =', channelName);
    const token = RtcTokenBuilder.buildTokenWithRtm(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid.toString(),
      RtcRole.PUBLISHER,
      expirationTime,
      expirationTime,
    );
    // console.log('Token generated successfully (RTC + RTM)');

    return NextResponse.json({
      token,
      uid: uid.toString(),
      channel: channelName,
      cap,
      viewCap: viewCapFor(channelName),
      talkCap: talkCapFor(channelName),
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate Agora token',
      },
      { status: 500 },
    );
  }
}
