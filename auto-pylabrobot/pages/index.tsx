import Cookies from 'js-cookie';

import { Alert, AlertTitle, Snackbar } from '@mui/material';
import Editor from '@monaco-editor/react';

import React, { useEffect, useRef, useState } from 'react';

// @ts-ignore
import promptPreamble from './promptPreamble.txt';

const DEFAULT_INSTRUCTION =
  'PyLabRobot Hamilton code to prepare a qPCR reaction. Inputs: one plate of forward primers, one plate of reverse primers, one plate of undiluted sample (1 uL needed per reaction), one plate already filled with master mix.';

const PromptComposerTab = () => {
  const [instruction, setInstruction] = useState<string>(DEFAULT_INSTRUCTION);

  const [hasPromptBeenCopied, setHasPromptBeenCopied] =
    useState<boolean>(false);

  return (
    <>
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-1/2 bg-neutral-700 p-4">
          <h1 className="text-3xl font-bold pb-4">Instructions</h1>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full h-96 text-black text-2xl bg-white border border-gray-300 p-2 mx-auto resize-none"
          />
          <div className="flex mt-2 items-center justify-between">
            <div />
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  promptPreamble +
                    '\n\n' +
                    '# Instruction' +
                    '\n\n' +
                    instruction
                );
                setHasPromptBeenCopied(true);
              }}
              className="w-44 text-white text-2xl bg-blue-500 ml-4 p-2 rounded"
            >
              Copy prompt
            </button>
          </div>
        </div>
      </div>
      <Snackbar
        open={hasPromptBeenCopied}
        onClose={() => setHasPromptBeenCopied(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setHasPromptBeenCopied(false)}>
          <AlertTitle>Prompt copied</AlertTitle>
          Paste the prompt into ChatGPT, in another tab.
        </Alert>
      </Snackbar>
    </>
  );
};

const SimulatorPane = ({
  loadingState,
  setLoadingState,
  scriptCode,
  setLogs,
}: {
  loadingState: 'INACTIVE' | 'LOADING' | 'LOADED';
  setLoadingState: (newLoadingState: 'INACTIVE' | 'LOADING' | 'LOADED') => void;
  scriptCode: string;
  setLogs: (newLogs: string) => void;
}) => {
  const [simulatorContainerId, setSimulatorContainerId] = useState<
    string | null
  >(null);

  // Define a function to fetch data on button click
  const fetchData = () => {
    setLoadingState('LOADING');

    // Make a fetch request to the API route
    fetch('/api/simulator/runScript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptCode }),
    })
      .then((response) => response.json())
      .then((data) => {
        Cookies.set('serverInternalSimulatorPort', data.http_port);
        Cookies.set('serverInternalSimulatorWebsocketPort', data.ws_port);
        // setTimeout is needed because the iframe will fail to load if it is instantiated too soon.
        setTimeout(() => setLoadingState('LOADED'), 1000);
        setSimulatorContainerId(data.container_id);
      })
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    if (simulatorContainerId == null) {
      return;
    }

    // A websocket or other log streaming implementation would be much better than this polling,
    // but I ran into trouble getting streaming to work with the server we use.
    const intervalId = setInterval(async () => {
      const response = await fetch(
        `/api/simulator/logs/${simulatorContainerId}`
      );
      const responseJson = await response.json();
      setLogs(responseJson.logs);
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [simulatorContainerId, setLogs]);

  if (loadingState === 'LOADED') {
    return (
      <iframe
        className="w-full h-full"
        // The index.html is necessary to ensure that /api/simulator/proxy/ is the base URL for all HTTP requests to the simulator
        src="/api/simulator/proxy/index.html"
      />
    );
  }

  if (loadingState === 'LOADING') {
    return (
      <div className="h-full flex justify-center items-center text-5xl font-bold">
        Loading...
      </div>
    );
  }

  if (scriptCode.trim().length === 0) {
    return (
      <div className="h-full flex justify-center items-center text-5xl font-bold" />
    );
  }

  return (
    <div
      className="h-full flex justify-center items-center text-5xl font-bold hover:bg-blue-500 hover:cursor-pointer"
      onClick={fetchData}
    >
      Simulate
    </div>
  );
};

const DEFAULT_SCRIPT_CODE = `import asyncio

from pylabrobot.liquid_handling import LiquidHandler
from pylabrobot.liquid_handling.backends.simulation.simulator_backend import SimulatorBackend
from pylabrobot.resources.hamilton import STARLetDeck
from pylabrobot.resources import (
    TIP_CAR_480_A00,
    PLT_CAR_L5AC_A00,
    Cos_96_DW_1mL,
    HTF_L,
    STF_L
)

async def main():
    sb = SimulatorBackend(open_browser=False)
    lh = LiquidHandler(backend=sb, deck=STARLetDeck())

    await lh.setup()

    sb.wait_for_connection()

    tip_car = TIP_CAR_480_A00(name='tip carrier')
    tip_car[0] = tips = HTF_L(name='tips_01')
    tip_car[1] = HTF_L(name='tips_02')
    tip_car[2] = HTF_L(name='tips_03')
    tip_car[3] = HTF_L(name='tips_04')
    tip_car[4] = HTF_L(name='tips_05')

    lh.deck.assign_child_resource(tip_car, rails=15)

    plt_car = PLT_CAR_L5AC_A00(name='plate carrier')
    plt_car[0] = plate = Cos_96_DW_1mL(name='plate_01')
    plt_car[1] = Cos_96_DW_1mL(name='plate_02')
    plt_car[2] = Cos_96_DW_1mL(name='plate_03')

    lh.deck.assign_child_resource(plt_car, rails=8)

    tiprack = lh.get_resource("tips_01")

    await sb.fill_tip_rack(tiprack)

    tips4 = lh.get_resource("tips_04")
    await sb.edit_tips(tips4, pattern=[[True]*6 + [False]*6]*8)
    await sb.edit_tips(lh.get_resource("tips_03"), pattern=[[True, False]*6]*8)
    await sb.edit_tips(lh.get_resource("tips_02"), pattern=[[True, True, False, False]*3]*8)

    plate_1 = lh.get_resource("plate_01")
    plate_2 = lh.get_resource("plate_02")

    await sb.adjust_well_volume(plate_1, pattern=[[500]*12]*8)
    await sb.adjust_well_volume(plate_2, pattern=[[100, 500]*6]*8)

    plate_1.set_well_volumes([[500]*12]*8)
    plate_2.set_well_volumes([[100, 500]*6]*8)

    tip_0 = lh.get_resource("tips_01")
    await lh.pick_up_tips(tip_0["A1", "B2", "C3", "D4"])
    await lh.drop_tips(tip_0["A1", "B2", "C3", "D4"])

    await lh.pick_up_tips(tip_0["A1"])
    plate = lh.get_resource("plate_01")
    await lh.aspirate(plate["A2"], vols=[300])
    await lh.dispense(plate_2["A1"], vols=[300])
    await lh.drop_tips(tip_0["A1"])

    await lh.pick_up_tips96(tiprack)
    await lh.aspirate_plate(plt_car[0].resource, volume=200)
    await lh.dispense_plate(plt_car[2].resource, volume=200)
    await lh.drop_tips96(tiprack)

    await lh.stop()

asyncio.run(main())`;

const SimulatorTab = () => {
  const [simulatorLoadingState, setSimulatorLoadingState] = useState<
    'INACTIVE' | 'LOADING' | 'LOADED'
  >('INACTIVE');
  const [scriptCode, setScriptCode] = useState<string>(DEFAULT_SCRIPT_CODE);
  const [logs, setLogs] = useState<string>('');

  // Declare a logsPaneRef and attach it to the <pre> element.
  const logsPaneRef = useRef<HTMLPreElement>(null);

  // Scroll the logs pane to the bottom whenever `logs` changes.
  useEffect(() => {
    if (logsPaneRef.current) {
      logsPaneRef.current.scrollTop = logsPaneRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="h-full">
        <div
          className={simulatorLoadingState !== 'LOADED' ? ' h-full' : ' h-2/3'}
        >
          <Editor
            theme="vs-dark"
            onChange={(value) => {
              setScriptCode(value ?? '');
            }}
            defaultLanguage="python"
            defaultValue={DEFAULT_SCRIPT_CODE}
          />
        </div>
        <pre
          ref={logsPaneRef}
          className={
            'h-1/3 flex-1 whitespace-pre-wrap font-mono overflow-scroll bg-black' +
            (simulatorLoadingState !== 'LOADED' ? ' hidden' : '')
          }
        >
          {logs}
        </pre>
      </div>
      <SimulatorPane
        loadingState={simulatorLoadingState}
        setLoadingState={setSimulatorLoadingState}
        scriptCode={scriptCode}
        setLogs={setLogs}
      />
    </div>
  );
};

const Home = () => {
  const [activeTab, setActiveTab] = useState<'promptComposer' | 'simulator'>(
    'promptComposer'
  );

  const handleTabClick = (tabName: 'promptComposer' | 'simulator') => {
    setActiveTab(tabName);
  };

  return (
    <div className="h-screen max-h-screen">
      <div className="bg-gray-800 p-4 h-full flex flex-col">
        <div className="flex pb-3">
          <button
            className={`flex-1 py-3 rounded text-center text-lg ${
              activeTab === 'promptComposer'
                ? 'bg-blue-500 text-white font-bold'
                : 'bg-gray-300 text-gray-600'
            }`}
            onClick={() => handleTabClick('promptComposer')}
          >
            Prompt Composer
          </button>
          <button
            className={`flex-1 py-3 rounded text-center text-lg ${
              activeTab === 'simulator'
                ? 'bg-blue-500 text-white font-bold'
                : 'bg-gray-300 text-gray-600'
            }`}
            onClick={() => handleTabClick('simulator')}
          >
            Simulator
          </button>
        </div>
        <div className="flex-1 h-full max-h-full">
          {activeTab === 'promptComposer' && <PromptComposerTab />}
          {activeTab === 'simulator' && <SimulatorTab />}
        </div>
      </div>
    </div>
  );
};

export default Home;
