import Cookies from 'js-cookie';

import Editor from '@monaco-editor/react';

import React, { useState } from 'react';

const SimulatorPane = ({ scriptCode }: { scriptCode: string }) => {
  const [simulatorLoadingState, setSimulatorLoadingState] = useState<
    'INACTIVE' | 'LOADING' | 'LOADED'
  >('INACTIVE');

  // Define a function to fetch data on button click
  const fetchData = () => {
    // Define the URL for the API route based on its location within pages/api
    const apiUrl = '/api/simulator/runScript';

    setSimulatorLoadingState('LOADING');

    // Make a fetch request to the API route
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scriptCode }),
    })
      .then((response) => response.json())
      .then((data) => {
        Cookies.set('serverInternalSimulatorPort', data.http_port);
        Cookies.set('serverInternalSimulatorWebsocketPort', data.ws_port);
        // setTimeout is needed because the iframe will fail to load if it is instantiated too soon.
        setTimeout(() => setSimulatorLoadingState('LOADED'), 1000);
      })
      .catch((error) => console.error(error));
  };

  if (simulatorLoadingState === 'LOADED') {
    return (
      <iframe
        className="w-full h-full"
        // The index.html is necessary to ensure that /api/simulator/proxy/ is the base URL for all HTTP requests to the simulator
        src="/api/simulator/proxy/index.html"
      />
    );
  }

  if (simulatorLoadingState === 'LOADING') {
    return (
      <div className="h-full flex justify-center items-center text-5xl bg-neutral-900">
        LOADING...
      </div>
    );
  }

  if (scriptCode.trim().length === 0) {
    return (
      <div className="h-full flex justify-center items-center text-5xl bg-neutral-900" />
    );
  }

  return (
    <div
      className="h-full flex justify-center items-center text-5xl bg-neutral-900 hover:bg-blue-800 hover:cursor-pointer"
      onClick={fetchData}
    >
      SIMULATE
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

export default function Home() {
  const [scriptCode, setScriptCode] = useState<string>(DEFAULT_SCRIPT_CODE);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Editor
        className="h-screen"
        theme="vs-dark"
        onChange={(value) => {
          setScriptCode(value ?? '');
        }}
        defaultLanguage="python"
        defaultValue={DEFAULT_SCRIPT_CODE}
      />
      <SimulatorPane scriptCode={scriptCode} />
    </div>
  );
}
