import { useEffect, useRef, useState } from 'react';
import LanguageSelector from './components/LanguageSelector';
import Progress from './components/Progress';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://buktbeyvzlhbalkpodkn.supabase.co';
const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a3RiZXl2emxoYmFsa3BvZGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4ODk5MzgsImV4cCI6MjAzNzQ2NTkzOH0.zHIazuMNLhXUlYjplCRTIZIoj1wAUpocCx_2-zMyP1I';

import './App.css';
import { LANGUAGES, languageMapping } from './utils/languages';

function App() {
  // Model loading
  const [ready, setReady] = useState(null);
  const disabled = useRef(false);
  const [progressItems, setProgressItems] = useState([]);

  // Inputs and outputs
  const [input, setInput] = useState('Hallo.');
  const inputRef = useRef(input);
  const [sourceLanguage, setSourceLanguage] = useState('deu_Latn');
  const sourceLanguageRef = useRef(sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState('eng_Latn');
  const targetLanguageRef = useRef(targetLanguage);
  const [output, setOutput] = useState('');

  // Create a reference to the worker object.
  const worker = useRef(null);

  // We use the `useEffect` hook to setup the worker as soon as the `App` component is mounted.
  useEffect(() => {
    if (!worker.current) {
      // Create the worker if it does not yet exist.
      worker.current = new Worker(new URL('./worker.js', import.meta.url), {
        type: 'module',
      });
    }

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e) => {
      switch (e.data.status) {
        case 'initiate':
          // Model file start load: add a new progress item to the list.
          setReady(false);
          setProgressItems((prev) => [...prev, e.data]);
          break;

        case 'progress':
          // Model file progress: update one of the progress items.
          setProgressItems((prev) =>
            prev.map((item) => {
              if (item.file === e.data.file) {
                return { ...item, progress: e.data.progress };
              }
              return item;
            })
          );
          break;

        case 'done':
          // Model file loaded: remove the progress item from the list.
          setProgressItems((prev) =>
            prev.filter((item) => item.file !== e.data.file)
          );
          break;

        case 'ready':
          // Pipeline ready: the worker is ready to accept messages.
          setReady(true);
          break;

        case 'update':
          // Generation update: update the output text.
          setOutput(e.data.output);
          break;

        case 'complete':
          // Generation complete: re-enable the "Translate" button
          disabled.current = false;
          break;
      }
    };

    // Attach the callback function as an event listener.
    worker.current.addEventListener('message', onMessageReceived);

    // Define a cleanup function for when the component is unmounted.
    return () =>
      worker.current.removeEventListener('message', onMessageReceived);
  });

  const translate = () => {
    if (disabled.current) return;
    if (sourceLanguageRef.current === targetLanguageRef.current) {
      setOutput(inputRef.current);
      return;
    }
    disabled.current = true;
    console.log('Translating...');
    worker.current.postMessage({
      text: inputRef.current,
      src_lang: sourceLanguageRef.current,
      tgt_lang: targetLanguageRef.current,
    });
  };

  // Start on load
  useEffect(() => {
    translate();
    // Subscribe to Supabase realtime broadcast
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const channel = supabase.channel('cityjsconfsg');
    channel
      .on('broadcast', { event: 'transcript' }, ({ payload }) => {
        setInput(payload.message);
        inputRef.current = payload.message;
        setSourceLanguage(languageMapping[payload.language]);
        sourceLanguageRef.current = languageMapping[payload.language];
        translate();
      })
      .subscribe();
  }, []);

  return (
    <>
      <h1>Transformers.js</h1>
      <h2>ML-powered multilingual translation in React!</h2>

      <div className="container">
        <div className="textbox-container">
          <h3>
            Transcript:{' '}
            {
              Object.entries(LANGUAGES).find(
                ([key, val]) => val === sourceLanguage
              )?.[0]
            }
          </h3>
        </div>

        <div className="textbox-container">
          <textarea value={input} rows={3} readOnly></textarea>
        </div>

        <div className="textbox-container">
          <LanguageSelector
            type={'Target'}
            defaultLanguage={targetLanguage}
            onChange={(x) => {
              setTargetLanguage(x.target.value);
              targetLanguageRef.current = x.target.value;
            }}
          />
        </div>

        <div className="textbox-container">
          <textarea value={output} rows={3} readOnly></textarea>
        </div>
      </div>

      <div className="progress-bars-container">
        {ready === false && <label>Loading models... (only run once)</label>}
        {progressItems.map((data) => (
          <div key={data.file}>
            <Progress text={data.file} percentage={data.progress} />
          </div>
        ))}
      </div>
    </>
  );
}

export default App;
