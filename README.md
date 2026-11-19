# WebComponentPoc

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.7.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Documents2

Uruchom [docs-api-test](https://github.com/depish1/docs-api-test) na porcie 3000.
Adapter repozytorium A używa `http://localhost:3000/api/files`. Oba przykłady
uruchamiaj z originu `http://localhost:4200` albo dodaj wybrany origin do
`CORS_ALLOWED_ORIGINS` serwera API.

### Angular Reactive Forms

Uruchom `npm ci`, potem `npm start` i otwórz
`http://localhost:4200/documents2`. Formularz podpina `Documents2` przez
`formControlName`. Regułę definiuje kontrolka, a komponent wyświetla przekazany
stan walidacji. Strona główna nadal pokazuje oryginalny komponent.

### Web Component w HTML i JavaScript

Zatrzymaj serwer Angular, uruchom `npm run build:element`, potem
`python -m http.server 4200 --directory dist/documents-element/browser`.
Otwórz `http://localhost:4200/`. Źródła strony są w `web-component-demo/`.
Do osadzenia w hoście użyj modułu `main.js` z tego buildu wraz z plikami JS
wygenerowanymi obok niego.

Po `customElements.whenDefined('baw-documents')` podłącz element do dokumentu
i poczekaj na `element.init({ repository: 'A', synchronizationMode: 'DEFERRED' })`.
Element udostępnia `setData()`, `getData()`, `commit()`, `isSynchronized()`,
`isValid` i `setValid(isValid, errorMsg?)`. Zdarzenia `documentsChanged`,
`documentAdded` i `documentRemoved` mają dane w `event.detail`.

W obu przykładach spróbuj zapisać pustą listę, dodaj plik i spróbuj ponownie.
Po zapisie zobaczysz metadane z ID zwróconym przez repozytorium. Możesz też
oznaczyć jedyny plik do usunięcia i sprawdzić, czy formularz ponownie blokuje zapis.

## Documents3 — Signal Forms

Po uruchomieniu testowego API i `npm start` otwórz
`http://localhost:4200/documents3`. Obie listy w przykładzie są odrębnymi
polami tego samego formularza Signal Forms. Pierwsza wymaga co najmniej jednego
aktywnego dokumentu.

Przekaż wartość początkową w modelu formularza i podepnij kontrolkę przez
`[formField]`. Zewnętrzna podmiana wartości pola tworzy nową listę dokumentów
i odrzuca dotychczasowe operacje odroczone tej listy. Host powinien blokować
podmianę podczas zapisu. Po `await commit()` i sprawdzeniu `isSynchronized()`
odczytaj listę bezpośrednio z modelu formularza, razem z ID nadanymi przez API.
