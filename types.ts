export enum VoiceName {
  // Female Voices
  Achernar = 'Achernar',
  Aoede = 'Aoede',
  Autonoe = 'Autonoe',
  Callirrhoe = 'Callirrhoe',
  Despina = 'Despina',
  Erinome = 'Erinome',
  Gacrux = 'Gacrux',
  Kore = 'Kore',
  Laomedeia = 'Laomedeia',
  Leda = 'Leda',
  Pulcherrima = 'Pulcherrima',
  Sulafat = 'Sulafat',
  Vindemiatrix = 'Vindemiatrix',
  Zephyr = 'Zephyr',

  // Male Voices
  Achird = 'Achird',
  Algenib = 'Algenib',
  Algieba = 'Algieba',
  Alnilam = 'Alnilam',
  Charon = 'Charon',
  Enceladus = 'Enceladus',
  Fenrir = 'Fenrir',
  Iapetus = 'Iapetus',
  Orus = 'Orus',
  Puck = 'Puck',
  Rasalgethi = 'Rasalgethi',
  Sadachbia = 'Sadachbia',
  Sadaltager = 'Sadaltager',
  Schedar = 'Schedar',
  Umbriel = 'Umbriel',
  Zubenelgenubi = 'Zubenelgenubi',
}

export enum VoiceSpeed {
  Slow = 'Slow',
  Normal = 'Normal',
  Fast = 'Fast',
}

export interface StyleDefinition {
  id?: string;
  name: string;
  prompt: string;
}

export interface TTSRequest {
  text: string;
  voice: VoiceName;
  stylePrompt: string;
}

export interface TTSResponse {
  audioData: string; // Base64 string
}