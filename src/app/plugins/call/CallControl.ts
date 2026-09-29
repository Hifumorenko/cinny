import { ClientWidgetApi } from 'matrix-widget-api';
import EventEmitter from 'events';
import { CallControlState } from './CallControlState';
import { ElementMediaStateDetail, ElementMediaStatePayload, ElementWidgetActions } from './types';

export enum CallControlEvent {
  StateUpdate = 'state_update',
}

export class CallControl extends EventEmitter implements CallControlState {
  private state: CallControlState;

  private call: ClientWidgetApi;

  private iframe: HTMLIFrameElement;

  private bodyMutationObserver: MutationObserver;

  private controlMutationObserver: MutationObserver;

  private mediaStatePromiseResolver: undefined | (() => void);

  private pushToTalk = false;

  private pushToTalkKeyPressed = false;

  private get document(): Document | undefined {
    return this.iframe.contentDocument ?? this.iframe.contentWindow?.document;
  }

  private get screenshareButton(): HTMLElement | undefined {
    const screenshareBtn = this.document?.querySelector(
      '[data-testid="incall_screenshare"]'
    ) as HTMLElement | null;

    return screenshareBtn ?? undefined;
  }

  private get leaveButton(): Element | undefined {
    const leaveBtn = this.document?.querySelector('[data-testid="incall_leave"]');

    return leaveBtn ?? undefined;
  }

  private get settingsButton(): HTMLElement | undefined {
    const settingsButtonLeft = this.document?.querySelector(
      '[data-testid="settings-bottom-left"]'
    ) as HTMLButtonElement | undefined;
    const settingsButtonCenter = this.document?.querySelector(
      '[data-testid="settings-bottom-center"]'
    ) as HTMLButtonElement | undefined;

    return settingsButtonLeft ?? settingsButtonCenter ?? undefined;
  }

  private get reactionsButton(): HTMLElement | undefined {
    const reactionsButton = this.leaveButton?.previousElementSibling as HTMLElement | null;

    return reactionsButton ?? undefined;
  }

  private get spotlightButton(): HTMLInputElement | undefined {
    const spotlightButton = this.document?.querySelector(
      'input[value="spotlight"]'
    ) as HTMLInputElement | null;

    return spotlightButton ?? undefined;
  }

  private get gridButton(): HTMLInputElement | undefined {
    const gridButton = this.document?.querySelector(
      'input[value="grid"]'
    ) as HTMLInputElement | null;

    return gridButton ?? undefined;
  }

  constructor(state: CallControlState, call: ClientWidgetApi, iframe: HTMLIFrameElement) {
    super();

    this.state = state;
    this.call = call;
    this.iframe = iframe;

    this.bodyMutationObserver = new MutationObserver(this.onBodyMutation.bind(this));
    this.controlMutationObserver = new MutationObserver(this.onControlMutation.bind(this));
  }

  public getState(): CallControlState {
    return this.state;
  }

  public get microphone(): boolean {
    return this.state.microphone;
  }

  public get video(): boolean {
    return this.state.video;
  }

  public get sound(): boolean {
    return this.state.sound;
  }

  public get screenshare(): boolean {
    return this.state.screenshare;
  }

  public get spotlight(): boolean {
    return this.state.spotlight;
  }

  public get pushToTalkKeyActive(): boolean {
    return this.pushToTalk && this.pushToTalkKeyPressed;
  }

  private get effectiveAudioEnabled(): boolean {
    if (this.pushToTalk) {
      return this.microphone && this.pushToTalkKeyPressed;
    }
    return this.microphone;
  }

  public setPushToTalk(enabled: boolean) {
    this.pushToTalk = enabled;
    this.setMediaState({
      audio_enabled: this.effectiveAudioEnabled,
      video_enabled: this.video,
    });
    this.refreshState();
  }

  public setPushToTalkKeyPressed(pressed: boolean) {
    if (this.pushToTalkKeyPressed === pressed) return;
    this.pushToTalkKeyPressed = pressed;
    if (this.pushToTalk) {
      this.setMediaState({
        audio_enabled: this.effectiveAudioEnabled,
        video_enabled: this.video,
      });
    }
    this.refreshState();
  }

  private refreshState() {
    this.state = new CallControlState(
      this.microphone,
      this.video,
      this.sound,
      this.screenshare,
      this.spotlight,
      this.pushToTalkKeyActive
    );
    this.emitStateUpdate();
  }

  public async applyState() {
    await this.setMediaState({
      audio_enabled: this.effectiveAudioEnabled,
      video_enabled: this.video,
    });
    this.setSound(this.sound);
    this.emitStateUpdate();
  }

  public startObserving() {
    if (!this.document) return;

    this.bodyMutationObserver.observe(this.document.body, {
      childList: true,
      subtree: false, // only direct children of body
    });
    this.onBodyMutation();
  }
  
  private onBodyMutation() {
    if (!this.document) return;

    this.document.body.style.setProperty('background', 'none', 'important');

    const controls = this.leaveButton?.parentElement?.parentElement;
    if (controls) {
      controls.style.setProperty('position', 'absolute');
      controls.style.setProperty('visibility', 'hidden');
    }

    this.observeControls();
  }

  private observeControls() {
    this.controlMutationObserver.disconnect();

    const screenshareBtn = this.screenshareButton;
    if (screenshareBtn) {
      this.controlMutationObserver.observe(screenshareBtn, {
        attributes: true,
        attributeFilter: ['data-kind'],
      });
    }
    const spotlightBtn = this.spotlightButton;
    if (spotlightBtn) {
      this.controlMutationObserver.observe(spotlightBtn, {
        attributes: true,
      });
    }

    this.onControlMutation();
  }

  public applySound() {
    this.setSound(this.sound);
  }

  private async setMediaState(state: ElementMediaStatePayload) {
    const data = await this.call.transport.send(ElementWidgetActions.DeviceMute, state);
    return new Promise<typeof data>(resolve => {
      if (this.mediaStatePromiseResolver) {
        this.mediaStatePromiseResolver();
      }
      this.mediaStatePromiseResolver = () => resolve(data);
    });
  }

  private setSound(sound: boolean): void {
    const callDocument = this.iframe.contentDocument ?? this.iframe.contentWindow?.document;
    if (callDocument) {
      callDocument.querySelectorAll('audio').forEach((el) => {
        // eslint-disable-next-line no-param-reassign
        el.muted = !sound;
      });
    }
  }

  public onMediaState(evt: CustomEvent<ElementMediaStateDetail>) {
    const { data } = evt.detail;
    if (!data) return;

    const state = new CallControlState(
      this.pushToTalk ? this.microphone : (data.audio_enabled ?? this.microphone),
      data.video_enabled ?? this.video,
      this.sound,
      this.screenshare,
      this.spotlight,
      this.pushToTalkKeyActive
    );

    this.state = state;
    this.emitStateUpdate();

    // The widget may echo an audio_enabled that doesn't match the key state
    // (e.g. it applied the mute before the key was released) - re-assert it.
    if (this.pushToTalk) {
      const desiredAudioEnabled = this.effectiveAudioEnabled;
      const currentAudioEnabled = data.audio_enabled ?? this.microphone;
      if (currentAudioEnabled !== desiredAudioEnabled) {
        this.setMediaState({
          audio_enabled: desiredAudioEnabled,
          video_enabled: data.video_enabled ?? this.video,
        });
      }
    }

    if (this.microphone && !this.sound) {
      this.toggleSound();
    }

    if (this.mediaStatePromiseResolver) {
      this.mediaStatePromiseResolver();
      this.mediaStatePromiseResolver = undefined;
    }
  }

  private onControlMutation() {
    const screenshare: boolean = this.screenshareButton?.getAttribute('data-kind') === 'primary';
    const spotlight: boolean = this.spotlightButton?.checked ?? false;

    this.state = new CallControlState(
      this.microphone,
      this.video,
      this.sound,
      screenshare,
      spotlight,
      this.pushToTalkKeyActive
    );
    this.emitStateUpdate();
  }

  public toggleMicrophone() {
    const previousEffective = this.effectiveAudioEnabled;

    this.state = new CallControlState(
      !this.microphone,
      this.video,
      this.sound,
      this.screenshare,
      this.spotlight,
      this.pushToTalkKeyActive
    );
    this.emitStateUpdate();

    const nextEffective = this.effectiveAudioEnabled;
    if (nextEffective === previousEffective) {
      // Arming/disarming push-to-talk while the key isn't held doesn't change
      // the widget's actual audio state, so it never echoes a DeviceMute
      // event back - resolve locally instead of waiting on one that never
      // arrives (which would otherwise leave the button stuck disabled).
      return Promise.resolve();
    }

    return this.setMediaState({
      audio_enabled: nextEffective,
      video_enabled: this.video,
    });
  }

  public toggleVideo() {
    const payload: ElementMediaStatePayload = {
      audio_enabled: this.effectiveAudioEnabled,
      video_enabled: !this.video,
    };
    return this.setMediaState(payload);
  }

  public toggleSound() {
    const sound = !this.sound;

    this.setSound(sound);

    const state = new CallControlState(
      this.microphone,
      this.video,
      sound,
      this.screenshare,
      this.spotlight,
      this.pushToTalkKeyActive
    );
    this.state = state;
    this.emitStateUpdate();

    if (!this.sound && this.microphone) {
      this.toggleMicrophone();
    }
  }

  public toggleScreenshare() {
    this.screenshareButton?.click();
  }

  public toggleSpotlight() {
    if (this.spotlight) {
      this.gridButton?.click();
      return;
    }
    this.spotlightButton?.click();
  }

  public toggleReactions() {
    this.reactionsButton?.click();
  }

  public toggleSettings() {
    this.settingsButton?.click();
  }

  public dispose() {
    this.bodyMutationObserver.disconnect();
    this.controlMutationObserver.disconnect();
  }

  private emitStateUpdate() {
    this.emit(CallControlEvent.StateUpdate);
  }
}
