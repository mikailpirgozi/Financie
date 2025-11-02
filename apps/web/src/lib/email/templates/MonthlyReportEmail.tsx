import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface MonthlyReportEmailProps {
  userName: string;
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  loansPaid: number;
  netWorth: number;
  dashboardUrl: string;
}

export function MonthlyReportEmail({
  userName,
  month,
  year,
  totalIncome,
  totalExpenses,
  netSavings,
  loansPaid,
  netWorth,
  dashboardUrl,
}: MonthlyReportEmailProps): React.ReactNode {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);

  const savingsRate = totalIncome > 0 ? ((netSavings / totalIncome) * 100).toFixed(1) : '0';

  return (
    <Html>
      <Head />
      <Preview>
        {`Váš mesačný finančný prehľad za ${month} ${year}`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>📊 Mesačný finančný prehľad</Heading>
          <Text style={text}>Ahoj {userName},</Text>
          <Text style={text}>
            Tu je váš finančný prehľad za <strong>{month} {year}</strong>:
          </Text>

          <Section style={statsBox}>
            <div style={statRow}>
              <Text style={statLabel}>💵 Celkové príjmy:</Text>
              <Text style={statValue}>{formatCurrency(totalIncome)}</Text>
            </div>
            <div style={statRow}>
              <Text style={statLabel}>💸 Celkové výdavky:</Text>
              <Text style={statValue}>{formatCurrency(totalExpenses)}</Text>
            </div>
            <div style={statRow}>
              <Text style={statLabel}>💰 Čisté úspory:</Text>
              <Text style={{...statValue, color: netSavings >= 0 ? '#2e7d32' : '#d32f2f'}}>
                {formatCurrency(netSavings)}
              </Text>
            </div>
            <div style={statRow}>
              <Text style={statLabel}>📈 Miera úspor:</Text>
              <Text style={statValue}>{savingsRate}%</Text>
            </div>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>Splátky úverov</Text>
            <Text style={infoText}>
              V tomto mesiaci ste splatili <strong>{formatCurrency(loansPaid)}</strong> na úveroch.
            </Text>
          </Section>

          <Section style={netWorthBox}>
            <Text style={netWorthLabel}>Vaša čistá hodnota:</Text>
            <Text style={netWorthValue}>{formatCurrency(netWorth)}</Text>
          </Section>

          {netSavings < 0 && (
            <Section style={warningBox}>
              <Text style={warningText}>
                ⚠️ Tento mesiac ste minuli viac, ako ste zarobili. Skúste analyzovať vaše výdavky
                a nájsť oblasti, kde môžete ušetriť.
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={dashboardUrl}>
              Zobraziť detailný prehľad
            </Button>
          </Section>

          <Text style={footer}>
            Tento prehľad je automaticky generovaný na konci každého mesiaca.
            <br />
            Tím FinApp
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 40px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 40px',
};

const statsBox = {
  backgroundColor: '#f8f9fa',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 40px',
};

const statRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '12px',
};

const statLabel = {
  color: '#555',
  fontSize: '15px',
  margin: '0',
  fontWeight: '500',
};

const statValue = {
  color: '#333',
  fontSize: '16px',
  margin: '0',
  fontWeight: '600',
};

const infoBox = {
  backgroundColor: '#e3f2fd',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '16px 40px',
};

const infoTitle = {
  color: '#1565c0',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
};

const infoText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const netWorthBox = {
  textAlign: 'center' as const,
  padding: '24px 40px',
  margin: '24px 0',
  borderTop: '1px solid #e0e0e0',
  borderBottom: '1px solid #e0e0e0',
};

const netWorthLabel = {
  color: '#555',
  fontSize: '14px',
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

const netWorthValue = {
  color: '#2e7d32',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
};

const warningBox = {
  backgroundColor: '#fff3e0',
  borderLeft: '4px solid #ff9800',
  borderRadius: '4px',
  padding: '16px 20px',
  margin: '16px 40px',
};

const warningText = {
  color: '#e65100',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#0070f3',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  padding: '0 40px',
  marginTop: '32px',
};

export default MonthlyReportEmail;

