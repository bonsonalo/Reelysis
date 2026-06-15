import QueryProvider  from './QueryProvider'
import ReduxProvider from './ReduxProvider'
import AuthInitializer from './AuthInitializer'




export default function AppProviders({children}: {children: React.ReactNode}) {
    return (
        <ReduxProvider>
            <QueryProvider>
                <AuthInitializer>
                    {children}
                </AuthInitializer>
            </QueryProvider>
        </ReduxProvider>
    )
}