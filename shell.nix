{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = [ pkgs.nodejs ];

  shellHook = ''
    if [ ! -d node_modules ]; then
      npm install
    fi
    echo "Starting dev server..."
    npx vite --open &
  '';
}
