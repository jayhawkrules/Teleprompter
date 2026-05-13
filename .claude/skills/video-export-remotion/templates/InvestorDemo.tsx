import { Composition, useCurrentFrame, interpolate, staticFile, Audio } from 'remotion';

interface Metric { label: string; value: string; }
interface Props  { appName: string; accentColor: string; darkBg: string; tagline: string; metrics: Metric[]; voiceoverFile?: string; }

const Comp = ({ appName, accentColor, darkBg, tagline, metrics, voiceoverFile }: Props) => {
  const frame   = useCurrentFrame();
  const titleO  = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ width: '100%', height: '100%', background: darkBg, position: 'relative', overflow: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {voiceoverFile && <Audio src={staticFile(voiceoverFile)} />}
      {frame < 180 && (
        <div style={{ opacity: titleO, position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: accentColor, fontSize: '28px', fontWeight: 600, marginBottom: '16px', letterSpacing: '2px', textTransform: 'uppercase' }}>{appName}</div>
          <h1 style={{ color: '#fff', fontSize: '64px', fontWeight: 800, textAlign: 'center', maxWidth: '900px' }}>{tagline}</h1>
        </div>
      )}
      {frame >= 180 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '80px' }}>
          {metrics.map((m, i) => {
            const o = interpolate(frame, [180 + i * 30, 210 + i * 30], [0, 1], { extrapolateRight: 'clamp' });
            return (
              <div key={m.label} style={{ opacity: o, textAlign: 'center' }}>
                <div style={{ color: accentColor, fontSize: '72px', fontWeight: 800, marginBottom: '8px' }}>{m.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '20px' }}>{m.label}</div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: '30px', left: '60px', color: 'rgba(255,255,255,0.3)', fontSize: '16px' }}>{appName} — Confidential</div>
    </div>
  );
};

export const RemotionRoot = () => (
  <Composition
    id="InvestorDemo" component={Comp}
    durationInFrames={2700} fps={30} width={1920} height={1080}
    defaultProps={{
      appName: 'Noelly', accentColor: '#F59E0B', darkBg: '#0a0f1e',
      tagline: 'Find the most magical holiday lights near you',
      metrics: [
        { label: 'Displays mapped', value: '12,000+' },
        { label: 'UK cities covered', value: '47' },
        { label: 'Waitlist signups', value: '3,200' },
      ],
    }}
  />
);
