import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SettingsScreen from '../components/SettingsScreen';
import GameScreen from '../components/GameScreen';
import OnlineBingoView from './OnlineBingoPage';

const DEFAULT_SETTINGS = {
  range: 64,
  callMode: 'manual',
  gameMode: 'single',
  autoSpeed: 2000,
};

export default function BingoPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  if (!settings) {
    return (
      <SettingsScreen
        defaults={DEFAULT_SETTINGS}
        onStart={setSettings}
        onHome={() => navigate('/')}
      />
    );
  }

  if (settings.gameMode === 'online') {
    return <OnlineBingoView onBack={() => setSettings(null)} />;
  }

  return (
    <GameScreen
      key={JSON.stringify(settings)}
      settings={settings}
      onBack={() => setSettings(null)}
    />
  );
}
