import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsScreen from '../components/SettingsScreen';
import GameScreen from '../components/GameScreen';

const DEFAULT_SETTINGS = {
  range: 64,
  callMode: 'manual',
  gameMode: 'single',
  autoSpeed: 2000,
};

export default function BingoPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  // Use the settings object as a key so GameScreen fully remounts on new game
  return settings ? (
    <GameScreen
      key={JSON.stringify(settings)}
      settings={settings}
      onBack={() => setSettings(null)}
    />
  ) : (
    <SettingsScreen
      defaults={DEFAULT_SETTINGS}
      onStart={setSettings}
      onHome={() => navigate('/')}
    />
  );
}
