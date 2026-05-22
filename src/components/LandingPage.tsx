import { Box, Button, Container, Typography } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CalculateIcon from '@mui/icons-material/Calculate';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface Props {
  onGetStarted: () => void;
}

const WARM = {
  bg: '#faf8f5',
  bgAlt: '#f3ede6',
  accent: '#c2704e',
  accentLight: '#e8c4b3',
  sage: '#7d9e8c',
  sageMuted: '#c5d6cd',
  text: '#2d2926',
  textMuted: '#6b6560',
  cream: '#f7f0e8',
  border: '#e5ddd3',
};

const tilePatternSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='29' height='29' x='0' y='0' fill='none' stroke='%23e5ddd3' stroke-width='0.5'/%3E%3Crect width='29' height='29' x='31' y='0' fill='none' stroke='%23e5ddd3' stroke-width='0.5'/%3E%3Crect width='29' height='29' x='0' y='31' fill='none' stroke='%23e5ddd3' stroke-width='0.5'/%3E%3Crect width='29' height='29' x='31' y='31' fill='none' stroke='%23e5ddd3' stroke-width='0.5'/%3E%3C/svg%3E")`;

const features = [
  {
    icon: <GridViewIcon sx={{ fontSize: 32 }} />,
    title: 'Vizuální editor',
    desc: 'Nakreslete stěny, dveře, niky a sprchové kouty. Viďte přesné rozložení dlaždic v reálném čase.',
  },
  {
    icon: <ViewInArIcon sx={{ fontSize: 32 }} />,
    title: '3D vizualizace',
    desc: 'Prohlédněte si místnost ve 3D ještě před tím, než koupíte první dlaždici.',
  },
  {
    icon: <CalculateIcon sx={{ fontSize: 32 }} />,
    title: 'Přesný rozpočet',
    desc: 'Automatický výpočet počtu dlaždic, řezných kusů a prořezu. Žádné překvapení v obchodě.',
  },
  {
    icon: <FolderIcon sx={{ fontSize: 32 }} />,
    title: 'Více projektů',
    desc: 'Spravujte více místností a projektů na jednom místě. Vše uloženo bezpečně v cloudu.',
  },
];

const steps = [
  { num: '01', title: 'Zadejte rozměry', desc: 'Výška, šířka a hloubka místnosti. Přidejte dveře, okna a niky.' },
  { num: '02', title: 'Vyberte dlaždice', desc: 'Nastavte velikost, barvu a dekor pro každou plochu zvlášť.' },
  { num: '03', title: 'Získejte rozpis', desc: 'Okamžitý přehled počtu dlaždic, řezných kusů a celkové plochy.' },
];

export default function LandingPage({ onGetStarted }: Props) {
  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: WARM.bg,
      fontFamily: '"DM Sans", "Open Sans", sans-serif',
      overflow: 'hidden',
    }}>
      {/* Load DM Serif Display & DM Sans */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes tileReveal {
          from { opacity: 0; transform: scale(0.85); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
      `}</style>

      {/* ── Navbar ── */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        px: { xs: 3, md: 6 }, py: 2.5,
        animation: 'fadeIn 0.8s ease-out',
      }}>
        <Typography sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '1.6rem', color: WARM.text, letterSpacing: '-0.02em',
        }}>
          Sparorez
        </Typography>
        <Button
          onClick={onGetStarted}
          sx={{
            color: WARM.text, fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
            fontSize: '0.95rem', textTransform: 'none', borderRadius: 0,
            borderBottom: `2px solid transparent`,
            '&:hover': { bgcolor: 'transparent', borderBottomColor: WARM.accent },
            transition: 'border-color 0.3s',
          }}
        >
          Přihlásit se
        </Button>
      </Box>

      {/* ── Hero ── */}
      <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 8, md: 14 }, position: 'relative' }}>
        {/* Decorative tile shapes */}
        <Box sx={{
          position: 'absolute', right: { xs: -20, md: 60 }, top: { xs: 0, md: 20 },
          width: { xs: 120, md: 200 }, height: { xs: 120, md: 200 },
          bgcolor: WARM.accentLight, opacity: 0.4,
          animation: 'float 6s ease-in-out infinite, tileReveal 1s ease-out 0.3s both',
        }} />
        <Box sx={{
          position: 'absolute', right: { xs: 30, md: 180 }, top: { xs: 80, md: 140 },
          width: { xs: 60, md: 100 }, height: { xs: 60, md: 100 },
          bgcolor: WARM.sageMuted, opacity: 0.35,
          animation: 'float 8s ease-in-out 1s infinite, tileReveal 1s ease-out 0.5s both',
        }} />
        <Box sx={{
          position: 'absolute', right: { xs: -10, md: 100 }, top: { xs: 140, md: 260 },
          width: { xs: 40, md: 70 }, height: { xs: 80, md: 140 },
          bgcolor: WARM.accent, opacity: 0.15,
          animation: 'float 7s ease-in-out 0.5s infinite, tileReveal 1s ease-out 0.7s both',
        }} />

        <Box sx={{ maxWidth: 700, position: 'relative', zIndex: 1 }}>
          <Typography sx={{
            fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
            fontSize: '0.85rem', letterSpacing: '0.15em', textTransform: 'uppercase',
            color: WARM.accent, mb: 3,
            animation: 'fadeUp 0.8s ease-out 0.2s both',
          }}>
            Kalkulačka obkladů a dlažby
          </Typography>

          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2.8rem', md: '4.2rem' }, lineHeight: 1.08,
            color: WARM.text, mb: 3, letterSpacing: '-0.02em',
            animation: 'fadeUp 0.8s ease-out 0.35s both',
          }}>
            Naplánujte si
            <br />
            obklady <Box component="span" sx={{
              fontStyle: 'italic', color: WARM.accent,
            }}>přesně</Box>
          </Typography>

          <Typography sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: { xs: '1.05rem', md: '1.2rem' }, lineHeight: 1.7,
            color: WARM.textMuted, maxWidth: 480, mb: 5,
            animation: 'fadeUp 0.8s ease-out 0.5s both',
          }}>
            Zadejte rozměry místnosti, vyberte dlaždice a okamžitě vidíte kolik
            jich potřebujete. Žádné odhady, žádné zbytečné nákupy.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', animation: 'fadeUp 0.8s ease-out 0.65s both' }}>
            <Button
              onClick={onGetStarted}
              endIcon={<ArrowForwardIcon />}
              sx={{
                bgcolor: WARM.accent, color: '#fff',
                fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
                fontSize: '1rem', textTransform: 'none',
                px: 4, py: 1.5, borderRadius: 0,
                '&:hover': { bgcolor: '#b0623f', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(194,112,78,0.3)' },
                transition: 'all 0.3s ease',
              }}
            >
              Začít plánovat
            </Button>
            <Button
              onClick={onGetStarted}
              sx={{
                color: WARM.text, fontFamily: '"DM Sans", sans-serif', fontWeight: 500,
                fontSize: '1rem', textTransform: 'none',
                px: 4, py: 1.5, borderRadius: 0,
                border: `1.5px solid ${WARM.border}`,
                '&:hover': { borderColor: WARM.text, bgcolor: 'transparent' },
                transition: 'all 0.3s ease',
              }}
            >
              Už mám účet
            </Button>
          </Box>
        </Box>
      </Container>

      {/* ── Features ── */}
      <Box sx={{ bgcolor: WARM.bgAlt, backgroundImage: tilePatternSvg, py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2rem', md: '2.8rem' }, color: WARM.text,
            mb: 1, letterSpacing: '-0.02em',
          }}>
            Všechno co potřebujete
          </Typography>
          <Typography sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '1.05rem', color: WARM.textMuted, mb: 6, maxWidth: 500,
          }}>
            Od náčrtu až po nákupní seznam. Jeden nástroj pro celou rekonstrukci.
          </Typography>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
            gap: 3,
          }}>
            {features.map((f, i) => (
              <Box key={i} sx={{
                bgcolor: '#fff', p: 3.5,
                border: `1px solid ${WARM.border}`,
                transition: 'all 0.35s ease',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  boxShadow: '0 12px 32px rgba(45,41,38,0.08)',
                  borderColor: WARM.accent,
                },
              }}>
                <Box sx={{ color: WARM.accent, mb: 2 }}>{f.icon}</Box>
                <Typography sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: '1.2rem', color: WARM.text, mb: 1,
                }}>
                  {f.title}
                </Typography>
                <Typography sx={{
                  fontFamily: '"DM Sans", sans-serif',
                  fontSize: '0.9rem', color: WARM.textMuted, lineHeight: 1.6,
                }}>
                  {f.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── How it works ── */}
      <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: WARM.bg }}>
        <Container maxWidth="lg">
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2rem', md: '2.8rem' }, color: WARM.text,
            mb: 6, letterSpacing: '-0.02em',
          }}>
            Tři jednoduché kroky
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: { xs: 4, md: 6 } }}>
            {steps.map((s, i) => (
              <Box key={i} sx={{ flex: 1, display: 'flex', gap: 2.5 }}>
                <Typography sx={{
                  fontFamily: '"DM Serif Display", serif',
                  fontSize: '3.5rem', lineHeight: 1, color: WARM.accentLight,
                  fontStyle: 'italic', minWidth: 70,
                }}>
                  {s.num}
                </Typography>
                <Box>
                  <Typography sx={{
                    fontFamily: '"DM Serif Display", serif',
                    fontSize: '1.3rem', color: WARM.text, mb: 0.5,
                  }}>
                    {s.title}
                  </Typography>
                  <Typography sx={{
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: '0.95rem', color: WARM.textMuted, lineHeight: 1.65,
                  }}>
                    {s.desc}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── CTA Section ── */}
      <Box sx={{
        py: { xs: 8, md: 10 },
        bgcolor: WARM.cream,
        backgroundImage: tilePatternSvg,
        textAlign: 'center',
      }}>
        <Container maxWidth="sm">
          <Typography sx={{
            fontFamily: '"DM Serif Display", serif',
            fontSize: { xs: '2rem', md: '2.6rem' }, color: WARM.text,
            mb: 2, letterSpacing: '-0.02em',
          }}>
            Připraveni na rekonstrukci?
          </Typography>
          <Typography sx={{
            fontFamily: '"DM Sans", sans-serif',
            fontSize: '1.05rem', color: WARM.textMuted, mb: 4, lineHeight: 1.7,
          }}>
            Zaregistrujte se zdarma a začněte plánovat své obklady. Žádná kreditní karta, žádné závazky.
          </Typography>
          <Button
            onClick={onGetStarted}
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: WARM.text, color: '#fff',
              fontFamily: '"DM Sans", sans-serif', fontWeight: 600,
              fontSize: '1.05rem', textTransform: 'none',
              px: 5, py: 1.8, borderRadius: 0,
              '&:hover': { bgcolor: '#1a1715', transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(45,41,38,0.2)' },
              transition: 'all 0.3s ease',
            }}
          >
            Vytvořit účet zdarma
          </Button>
        </Container>
      </Box>

      {/* ── Footer ── */}
      <Box sx={{
        py: 4, px: { xs: 3, md: 6 },
        borderTop: `1px solid ${WARM.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 2,
      }}>
        <Typography sx={{
          fontFamily: '"DM Serif Display", serif',
          fontSize: '1.1rem', color: WARM.textMuted,
        }}>
          Sparorez
        </Typography>
        <Typography sx={{
          fontFamily: '"DM Sans", sans-serif',
          fontSize: '0.8rem', color: WARM.textMuted,
        }}>
          Bezplatný nástroj pro plánování obkladů a dlažby
        </Typography>
      </Box>
    </Box>
  );
}
