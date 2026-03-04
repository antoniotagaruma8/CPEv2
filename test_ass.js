const { assessSpeakingAction } = require('./.next/server/app/actions/assessSpeaking.js');
async function test() {
  try {
    const fakeAudio = 'data:audio/webm;codecs=opus;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwEAAAAAAAB4EEAwhrhEQsZARg==';
    const res = await assessSpeakingAction(fakeAudio, 'Describe this photo', 'B2');
    console.log(res);
  } catch(e) { console.error('CRASH:', e); }
}
test();
