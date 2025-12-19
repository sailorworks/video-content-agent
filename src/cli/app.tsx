// src/cli/app.tsx
import { render, Box, Text, useApp } from 'ink';
import React, { useState, useEffect } from 'react';
import chalk from 'chalk';
import Form from '@inkjs/ui/Form';
import TextInput from '@inkjs/ui/TextInput';
import { FormInput } from './components/FormInput';
import { ProgressSpinner } from './components/ProgressSpinner';
import { ScriptReview } from './components/ScriptReview';
import { runWorkflow } from './workflow';

const App: React.FC = () => {
  const [step, setStep] = useState<'input' | 'research' | 'generate' | 'review' | 'voiceover' | 'video' | 'done' | 'error'>('input');
  const [topic, setTopic] = useState('');
  const [script, setScript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { exit } = useApp();

  const handleTopicSubmit = (values: { topic: string }) => {
    setTopic(values.topic);
    setStep('research');
  };

  const handleFeedbackSubmit = (values: { feedback: string }) => {
    setFeedback(values.feedback);
    setStep('voiceover');
  };

  useEffect(() => {
    const executeStep = async () => {
      try {
        switch (step) {
          case 'research':
            await runWorkflow.research(topic);
            setStep('generate');
            break;
          case 'generate':
            const generatedScript = await runWorkflow.generateScript(topic);
            setScript(generatedScript);
            setStep('review');
            break;
          case 'voiceover':
            await runWorkflow.produceVoiceover(script, feedback);
            setStep('video');
            break;
          case 'video':
            await runWorkflow.produceVideo();
            setStep('done');
            break;
          case 'done':
            exit();
            break;
        }
      } catch (err) {
        setError((err as Error).message);
        setStep('error');
      }
    };

    if (['research', 'generate', 'voiceover', 'video'].includes(step)) {
      executeStep();
    }
  }, [step, topic, script, feedback]);

  return (
    <Box flexDirection="column" padding={2} borderStyle="round" borderColor="blue">
      <Text color="green" bold>
        {chalk.bold('Video Content Agent CLI')}
      </Text>
      {error && <Text color="red">{chalk.italic(`Error: ${error}`)}</Text>}
      {step === 'input' && (
        <Form onSubmit={handleTopicSubmit}>
          <Form.Label name="topic">Enter video topic:</Form.Label>
          <TextInput name="topic" placeholder="e.g., 'AI in everyday life'" />
        </Form>
      )}
      {['research', 'generate', 'voiceover', 'video'].includes(step) && (
        <ProgressSpinner label={`Processing: ${step.charAt(0).toUpperCase() + step.slice(1)}...`} />
      )}
      {step === 'review' && (
        <ScriptReview script={script} onFeedbackSubmit={handleFeedbackSubmit} />
      )}
      {step === 'done' && (
        <Text color="green" bold>
          {chalk.bold('Video production complete!')}
        </Text>
      )}
      {step === 'error' && (
        <Text color="red" bold>
          Process halted due to error. Please try again.
        </Text>
      )}
    </Box>
  );
};

render(<App />);
