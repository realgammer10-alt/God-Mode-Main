import React from 'react';
import { ProviderInterface } from 'lib/types';
import {
	EndpointHealthResult,
	EndpointStatus,
	HEALTH_CHECK_INTERVAL_MS,
	WebviewHealth,
} from 'lib/monitoring';

type EndpointState = Partial<EndpointHealthResult> & {
	status?: EndpointStatus;
	error?: string;
};

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'The endpoint check failed.';
}

function statusColor(status: string): string {
	switch (status) {
		case 'online':
			return 'bg-green-500';
		case 'loading':
		case 'checking':
		case 'degraded':
			return 'bg-yellow-500';
		case 'offline':
			return 'bg-red-500';
		default:
			return 'bg-gray-400';
	}
}

function statusLabel(status: string | undefined): string {
	if (!status || status === 'unknown') return 'Waiting for first load';
	if (status === 'loading') return 'Loading';
	if (status === 'checking') return 'Checking';
	if (status === 'online') return 'Online';
	if (status === 'degraded') return 'Reachable, HTTP error';
	return 'Offline';
}

export default function MonitoringDashboard({
	providers,
	webviewHealth,
}: {
	providers: ProviderInterface[];
	webviewHealth: Record<string, WebviewHealth>;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [endpointHealth, setEndpointHealth] = React.useState<
		Record<string, EndpointState>
	>({});
	const isCheckingRef = React.useRef(false);
	const [isChecking, setIsChecking] = React.useState(false);

	const checkEndpoints = React.useCallback(async () => {
		if (isCheckingRef.current || providers.length === 0) return;
		isCheckingRef.current = true;
		setIsChecking(true);
		setEndpointHealth((current) => {
			const next = { ...current };
			providers.forEach((provider) => {
				next[provider.webviewId] = { status: 'checking' };
			});
			return next;
		});

		try {
			await Promise.all(
				providers.map(async (provider) => {
					try {
						const result = await window.electron.monitoring.checkEndpoint(
							provider.url,
						);
						setEndpointHealth((current) => ({
							...current,
							[provider.webviewId]: result,
						}));
					} catch (error) {
						setEndpointHealth((current) => ({
							...current,
							[provider.webviewId]: {
								status: 'offline',
								error: errorMessage(error),
								checkedAt: Date.now(),
							},
						}));
					}
				}),
			);
		} finally {
			isCheckingRef.current = false;
			setIsChecking(false);
		}
	}, [providers]);

	React.useEffect(() => {
		void checkEndpoints();
		const interval = window.setInterval(
			() => void checkEndpoints(),
			HEALTH_CHECK_INTERVAL_MS,
		);
		return () => window.clearInterval(interval);
	}, [checkEndpoints]);

	const onlinePages = providers.filter(
		(provider) => webviewHealth[provider.webviewId]?.status === 'online',
	).length;
	const onlineEndpoints = providers.filter(
		(provider) => endpointHealth[provider.webviewId]?.status === 'online',
	).length;

	return (
		<div className="absolute right-3 top-0 z-30">
			<button
				type="button"
				className="h-[26px] px-2 text-xs text-gray-200 hover:text-green-300 focus:outline-none focus:ring-1 focus:ring-green-300"
				aria-label="Open provider monitoring dashboard"
				aria-expanded={isOpen}
				aria-controls="provider-monitoring-dashboard"
				onClick={() => setIsOpen((open) => !open)}
			>
				Monitor {onlinePages}/{providers.length} ready
			</button>
			{isOpen && (
				<section
					id="provider-monitoring-dashboard"
					role="dialog"
					aria-label="Provider monitoring dashboard"
					className="fixed right-3 top-8 z-50 max-h-[75vh] w-[min(30rem,95vw)] overflow-auto rounded-lg border border-gray-300 bg-white p-4 text-gray-900 shadow-2xl"
				>
					<div className="mb-3 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-sm font-semibold">Provider health</h2>
							<p className="text-xs text-gray-600" aria-live="polite">
								{onlinePages} of {providers.length} pages loaded;{' '}
								{onlineEndpoints} endpoints responding
							</p>
						</div>
						<button
							type="button"
							className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 disabled:opacity-50"
							disabled={isChecking}
							onClick={() => void checkEndpoints()}
						>
							Check now
						</button>
					</div>
					{providers.length === 0 ? (
						<p className="py-3 text-sm text-gray-600">
							No providers are enabled.
						</p>
					) : (
						<ul className="divide-y divide-gray-200">
							{providers.map((provider) => {
								const page = webviewHealth[provider.webviewId];
								const endpoint = endpointHealth[provider.webviewId];
								return (
									<li className="py-3" key={provider.webviewId}>
										<div className="mb-2 flex items-center justify-between gap-2">
											<strong className="truncate text-sm">
												{provider.fullName}
											</strong>
											<span className="truncate text-xs text-gray-500">
												{new URL(provider.url).hostname}
											</span>
										</div>
										<div className="grid grid-cols-2 gap-3 text-xs">
											<div>
												<div className="flex items-center gap-1.5">
													<span
														className={`h-2 w-2 shrink-0 rounded-full ${statusColor(page?.status || 'unknown')}`}
													/>
													<span>Page: {statusLabel(page?.status)}</span>
												</div>
												{page?.error && (
													<p className="mt-1 break-words text-red-700">
														{page.error}
													</p>
												)}
												{page?.updatedAt && (
													<p className="mt-1 text-gray-500">
														Updated{' '}
														{new Date(
															page.updatedAt,
														).toLocaleTimeString()}
													</p>
												)}
											</div>
											<div>
												<div className="flex items-center gap-1.5">
													<span
														className={`h-2 w-2 shrink-0 rounded-full ${statusColor(endpoint?.status || 'unknown')}`}
													/>
													<span>
														Endpoint: {statusLabel(endpoint?.status)}
														{endpoint?.statusCode
															? ` (${endpoint.statusCode})`
															: ''}
													</span>
												</div>
												{endpoint?.latencyMs !== undefined && (
													<p className="mt-1 text-gray-600">
														{endpoint.latencyMs} ms
													</p>
												)}
												{endpoint?.error && (
													<p className="mt-1 break-words text-red-700">
														{endpoint.error}
													</p>
												)}
												{endpoint?.checkedAt && (
													<p className="mt-1 text-gray-500">
														Checked{' '}
														{new Date(
															endpoint.checkedAt,
														).toLocaleTimeString()}
													</p>
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					)}
					<p className="mt-2 text-[11px] text-gray-500">
						Checks run every minute. Requests are lightweight HEAD checks and
						do not use provider login cookies.
					</p>
				</section>
			)}
		</div>
	);
}
