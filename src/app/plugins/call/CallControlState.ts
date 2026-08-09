export class CallControlState {
  public readonly microphone: boolean;

  public readonly video: boolean;

  public readonly sound: boolean;

  public readonly screenshare: boolean;

  public readonly spotlight: boolean;

  public readonly pushToTalkKeyActive: boolean;

  constructor(
    microphone: boolean,
    video: boolean,
    sound: boolean,
    screenshare = false,
    spotlight = false,
    pushToTalkKeyActive = false
  ) {
    this.microphone = microphone;
    this.video = video;
    this.sound = sound;
    this.screenshare = screenshare;
    this.spotlight = spotlight;
    this.pushToTalkKeyActive = pushToTalkKeyActive;
  }
}
