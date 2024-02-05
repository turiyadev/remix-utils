import { useEffect, useState, createContext, useContext } from "react";

export type EventSourceMode = "latest" | "list";

export type EventSourceData<T extends EventSourceMode> = T extends "list"
	? string[]
	: string;

export interface EventSourceOptions<T extends EventSourceMode> {
	init?: EventSourceInit;
	event?: string;
	mode?: T;
}

export type EventSourceMap = Map<
	string,
	{ count: number; source: EventSource }
>;

const context = createContext<EventSourceMap>(
	new Map<string, { count: number; source: EventSource }>(),
);

export const EventSourceProvider = context.Provider;

/**
 * Subscribe to an event source and return the latest event or a list of events.
 * @param url The URL of the event source to connect to
 * @param options The options to pass to the EventSource constructor
 * @param mode Return the "latest" event (default), or a "list" of received events
 * @returns The last event received from the server
 */
export function useEventSource<T extends EventSourceMode>(
	url: string | URL,
	{ event = "message", init, mode }: EventSourceOptions<T> = {},
) {
	let map = useContext(context);
	let [data, setData] = useState<EventSourceData<T> | null>(null);

	useEffect(() => {
		let key = [url.toString(), init?.withCredentials].join("::");

		let value = map.get(key) ?? {
			count: 0,
			source: new EventSource(url, init),
		};

		++value.count;

		map.set(key, value);

		value.source.addEventListener(event, handler);

		// reset data if dependencies change
		setData(null);

		function handler(event: MessageEvent) {
			let eventData = event.data || "UNKNOWN_EVENT_DATA";
			mode === "list"
				? setData(
						(state) =>
							(state
								? state.concat(eventData)
								: [eventData]) as EventSourceData<T>,
				  )
				: setData(eventData);
		}

		return () => {
			value.source.removeEventListener(event, handler);
			--value.count;
			if (value.count <= 0) {
				value.source.close();
				map.delete(key);
			}
		};
	}, [url, event, init, mode, map]);

	return data;
}
