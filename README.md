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

## Documents — Signal Forms

Uruchom [docs-api-test](https://github.com/depish1/docs-api-test) na porcie 3000.
Adapter repozytorium A używa `http://localhost:3000/api/files`. Oba przykłady
uruchamiaj z originu `http://localhost:4200` albo dodaj wybrany origin do
`CORS_ALLOWED_ORIGINS` serwera API.

Uruchom `npm ci`, potem `npm start` i otwórz
`http://localhost:4200/documents3`. Obie listy są osobnymi polami Signal Forms.
Pierwsza wymaga co najmniej jednego aktywnego dokumentu.

## Web Component dla BAW

Uruchom `npm ci`, a następnie `npm run build:element`. Wynik to
`dist/documents-element/main.js`. Skopiuj go obok HTML swojej strony jako
`baw-documents.js` i dodaj na stronie:

```html
<div id="documents-container"></div>

<script type="module">
  import './baw-documents.js';

  await customElements.whenDefined('baw-documents');

  const documents = document.createElement('baw-documents');
  documents.init({
    repository: 'A',
    synchronizationMode: 'DEFERRED',
    initialData: [],
    onChange: (data) => console.log(data),
  });

  document.querySelector('#documents-container').append(documents);
</script>
```

Do lokalnego testu uruchom `python -m http.server 4200` w katalogu swojej
strony i otwórz `http://localhost:4200`. Operacje na repozytorium A wymagają
`docs-api-test` na `http://localhost:3000`. Jeśli strona jest pod innym
originem niż `http://localhost:4200`, uwzględnij go w konfiguracji CORS API.

- `init(options?)` wywołuje się raz na instancję, synchronicznie. Domyślna lista
  jest pusta. Inicjalizacja nie wywołuje callbacku.
- `getData()` zwraca kopię aktywnych metadanych. `setData(data)` zastępuje listę
  dokumentami w stanie `DEFAULT` i odrzuca starą kolejkę. Podczas `commit()`
  wywołanie `setData()` zgłasza wyjątek.
- `onChange(data)` otrzymuje migawkę po zmianie wartości, także po `setData()`
  i nadaniu ID przez API. Powiadomienia są dostarczane w mikrozadaniach.
- `isValid` i `isSynchronized` to niezależne właściwości do odczytu.
  `setValid(false, message?)` ustawia błąd BAW z opcjonalnym tekstem,
  a `setValid(true)` go czyści.
- `commit()` zwraca obietnicę synchronizacji zamontowanej kontrolki.
  Po zakończeniu odczytaj `isSynchronized` i świeże `getData()`.

Po `setData()` wyniki żądań dotyczących starej listy nie aktualizują nowej
listy. Serwer może nadal wykonać żądanie, które już do niego dotarło.
